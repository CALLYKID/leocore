/**
 * LEOCORE AI — MISSION CRITICAL HANDLER
 * Version: 4.5 (Production Shielded)
 */

import 'dotenv/config';
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";

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
const tvly = process.env.TAVILY_API_KEY ? tavily({ apiKey: process.env.TAVILY_API_KEY }) : null;

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

    // 1. FAILSAFE SEARCH (Wrapped to prevent crashing the whole request)
    if ((mode === 'research' || mode === 'study') && tvly) {
      try {
        const intent = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "Reply YES only if the user query needs real-time info or facts. Otherwise NO." },
            { role: "user", content: message }
          ],
          max_tokens: 5
        });

        if (intent.choices[0].message.content.toUpperCase().includes("YES")) {
          const searchRes = await tvly.search(message, { searchDepth: "basic", maxResults: 4 });
          searchContext = "\n[WEB DATA]: " + searchRes.results.map(r => r.content).join(" ");
          sources = searchRes.results.map(r => ({
            title: r.title,
            url: r.url,
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}`
          }));
        }
      } catch (e) {
        console.error("Search module bypassed due to error:", e.message);
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
