/**
 * LEOCORE AI — MISSION CRITICAL HANDLER
 * Version: 4.5 (Production Shielded)
 */

import 'dotenv/config';
import Groq from "groq-sdk";

// --- CONFIGURATION ---
const MODE_CONFIGS = {
  default:   { model: "llama-3.1-8b-instant",       temp: 0.6, memLimit: 12 },
  study:     { model: "llama-3.3-70b-versatile",     temp: 0.3, memLimit: 20 },
  research:  { model: "llama-3.3-70b-versatile",     temp: 0.2, memLimit: 25 },
  deep:      { model: "llama-3.3-70b-versatile",     temp: 0.7, memLimit: 30 },
  chill:     { model: "llama-3.1-8b-instant",       temp: 0.8, memLimit: 15 },
  precision: { model: "llama-3.3-70b-versatile",     temp: 0.1, memLimit: 10 },
  roast:     { model: "llama-3.1-8b-instant",       temp: 1.0, memLimit: 12 },
  vision:    { model: "llama-3.2-11b-vision-preview", temp: 0.5, memLimit: 10 }
};

const GLOBAL_RULES = `CORE DIRECTIVE: You are LeoCore. 
1. Tone: Casual Gen Z style with witty slangs. Relatable partner vibe.
2. STRICT OUTPUT FORMAT: PLAIN TEXT ONLY. NO HTML, NO MARKDOWN.
3. ZERO TOLERANCE: Never use racial slurs or derogatory terms. 
4. SAFETY: If the user asks for anything harmful, refuse politely in your persona.`;

const MODE_PROMPTS = {
  study: "You are a genius tutor. Break down complex topics into simple steps.",
  research: "You are a lead investigator. Use the provided search data to be extremely thorough.",
  roast: "You are a savage comedian. Use heavy sarcasm.",
  chill: "You are a relaxed friend. Use very casual slang.",
  deep: "You are a philosophical sage.",
  precision: "You are a high-speed processor. Short, factual answers.",
  vision: "You are a visual analyst. Describe the provided image accurately."
};

// --- INITIALIZATION ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;


// --- UTILS ---
function stripFormatting(text = "") {
  return typeof text === 'string' ? text.replace(/[*#_`]/g, "") : text;
}

async function checkSafety(content) {
  try {
    const check = await groq.chat.completions.create({
      model: "llama-guard-3-8b", 
      messages: [{ role: "user", content }],
    });
    return !check.choices[0].message.content.toLowerCase().includes("unsafe");
  } catch (e) {
    return true; // Failsafe: allow if safety check itself crashes
  }
}

// --- HANDLER ---
export default async function chatHandler(req, res) {
  // CORS Handlers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "Missing API Configuration" });
  }

  try {
    const { message, mode, memory = [], image = null } = req.body;
    const config = MODE_CONFIGS[mode] || MODE_CONFIGS.default;
    let searchContext = "";
    let sources = [];

// --- STEP A: BRAVE SEARCH (Only for Research/Study) ---
if ((mode === 'research' || mode === 'study') && BRAVE_API_KEY) {
  try {
    // 1. IMPROVED INTENT CHECK
    const intent = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Determine if the user's latest message requires real-time information or news. Reply with exactly one word: 'YES' or 'NO'." },
        { role: "user", content: message }
      ],
      max_tokens: 5,
      temperature: 0 // Keep it deterministic
    });

    const decision = intent.choices[0].message.content.trim().toUpperCase();
    console.log(`Debug: Intent decision was [${decision}]`);

    // 2. ROBUST CHECK (Look for YES anywhere in the response)
    if (decision.includes("YES")) {
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(message)}&count=3`, {
        method: 'GET',
        headers: { 
          'X-Subscription-Token': BRAVE_API_KEY, 
          'Accept': 'application/json' // Crucial for production stability
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Brave API Error: ${response.status} - ${errorData}`);
      } else {
        const data = await response.json();
        if (data.web?.results && data.web.results.length > 0) {
          // Join snippets into a clean context string
          searchContext = "\n[CURRENT WEB DATA]: " + data.web.results.map(r => r.description).join(" ");
          sources = data.web.results.map(r => ({ title: r.title, url: r.url }));
          console.log(`Success: Found ${sources.length} sources.`);
        }
      }
    }
  } catch (err) { 
    console.error("Search block critical failure:", err.message); 
  }
}


    // 2. BUILD PROMPT
    const persona = MODE_PROMPTS[mode] || "Be a helpful assistant.";
    const apiMessages = [
      { role: "system", content: `${GLOBAL_RULES}\nMODE: ${persona}\n${searchContext}` },
      ...memory.slice(-config.memLimit).map(m => ({
        role: m.role === "leocore" ? "assistant" : "user",
        content: stripFormatting(Array.isArray(m.content) ? "Image uploaded" : m.content)
      }))
    ];

    // Final turn
    if (image) {
      apiMessages.push({
        role: "user",
        content: [
          { type: "text", text: stripFormatting(message) || "Analyze this." },
          { type: "image_url", image_url: { url: image } }
        ]
      });
    } else {
      apiMessages.push({ role: "user", content: stripFormatting(message) });
    }

    // 3. EXECUTE MAIN AI CALL
    const completion = await groq.chat.completions.create({
      model: image ? MODE_CONFIGS.vision.model : config.model,
      messages: apiMessages,
      temperature: config.temp,
    });

    let aiResponse = completion.choices[0].message.content;

    // 4. FINAL SAFETY JUDGE
    const safe = await checkSafety(aiResponse);
    if (!safe) {
      aiResponse = "yo, i was gonna say something but the vibes got a bit weird. let's pivot to something else.";
    }

    // 5. DISPATCH
    return res.status(200).json({
      text: stripFormatting(aiResponse),
      sources: sources
    });

  } catch (err) {
    console.error("SERVER CRITICAL:", err);
    res.status(500).json({ error: "My brain short-circuited. Try again in a sec?" });
  }
}
