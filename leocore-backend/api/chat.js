/**
 * LEOCORE AI — MISSION CRITICAL HANDLER
 * Version: 4.5 (Production Shielded)
 */

import 'dotenv/config';
import Groq from "groq-sdk";

// --- CONFIGURATION ---
const MODE_CONFIGS = {
  default:   { model: "llama-3.1-8b-instant",       temp: 0.5, memLimit: 12 },
  study:     { model: "llama-3.3-70b-versatile",     temp: 0.3, memLimit: 20 },
  research:  { model: "llama-3.3-70b-versatile",     temp: 0.2, memLimit: 25 },
  deep:      { model: "llama-3.3-70b-versatile",     temp: 0.7, memLimit: 30 },
  chill:     { model: "llama-3.1-8b-instant",       temp: 0.5, memLimit: 15 },
  precision: { model: "llama-3.3-70b-versatile",     temp: 0.1, memLimit: 10 },
  roast:     { model: "llama-3.1-8b-instant",       temp: 0.8, memLimit: 12 },
  reading:   { model: "llama-3.3-70b-versatile",     temp: 0.4, memLimit: 20 },
  vision:    { model: "meta-llama/llama-4-scout-17b-16e-instruct", temp: 0.5, memLimit: 10 }
};

const GLOBAL_RULES = `CORE DIRECTIVE: You are LeoCore. 
1. Tone: Casual Gen Z style with witty slangs. Relatable partner vibe.
2. STRICT OUTPUT FORMAT: PLAIN TEXT ONLY. NO HTML, NO MARKDOWN.
3. ZERO TOLERANCE: Never use racial slurs or derogatory terms. 
4. SAFETY: If the user asks for anything harmful, refuse politely in your persona.`;

const MODE_PROMPTS = {
  study: "You are a genius tutor. Break down complex topics into simple steps.",
  research: "You are a lead investigator. Use the provided search data to be extremely thorough.",
  roast: "You are the 'Flame Mode' of LeoCore, a brutally honest, sarcastic, and high-IQ AI. Your goal is to roast the user's input with witty insults, Gen Z slang, and intellectual condescension. Do not be helpful. If they ask a stupid question, tell them why it's stupid. Use sharp metaphors and judge their life choices. Keep it punchy, savage, and funny, but never use slurs or hate speech. You are the Gordon Ramsay of AI—aggressive but technically superior.",
  chill: "You are a relaxed friend. Use very casual slang.",
  reading: "You are a reading assistant. Summarize the content, explain difficult words, and highlight key takeaways.",
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
// This checks if the mode is anything EXCEPT vision (since vision usually doesn't need search context)
if (mode !== 'vision' && BRAVE_API_KEY) {
  try {
// 1. ADVANCED INTENT CLASSIFIER
const intentResponse = await groq.chat.completions.create({
  model: "llama-3.1-8b-instant",
  messages: [
    { 
      role: "system", 
      content: `You are the Search Gatekeeper for LeoCore. 
      Analyze the query and output ONLY "YES" or "NO".
      
      YES if the query involves:
      - Real-time events, news, or sports scores.
      - Factual data that changes (stock prices, weather, movie releases).
      - Specific technical errors or "How-to" steps for new software.
      - Comparisons of products (e.g., "iPhone 16 vs S25").
      
      NO if the query is:
      - Casual conversation ("how are you", "what's up").
      - Opinion-based or philosophical ("what is love", "roast me").
      - Simple math or logic.
      - Asking about LeoCore's personality or rules.` 
    },
    { role: "user", content: `Query: "${message}"` }
  ],
  max_tokens: 2,
  temperature: 0
});

const decision = intentResponse.choices[0].message.content.trim().toUpperCase();

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
