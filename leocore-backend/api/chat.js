/**
 * LEOCORE AI — MISSION CRITICAL HANDLER
 * Version: 4.2 (Search Integrated)
 */

import 'dotenv/config';
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";

const MODE_CONFIGS = {
  default:   { model: "llama-3.1-8b-instant",       temp: 0.6, memLimit: 12 },
  study:     { model: "llama-3.3-70b-versatile",     temp: 0.3, memLimit: 20 },
  research:  { model: "llama-3.3-70b-versatile",     temp: 0.2, memLimit: 25 },
  deep:      { model: "llama-3.3-70b-versatile",     temp: 0.7, memLimit: 30 },
  chill:     { model: "llama-3.1-8b-instant",       temp: 0.8, memLimit: 15 },
  precision: { model: "llama-3.3-70b-versatile",     temp: 0.1, memLimit: 10 },
  roast:     { model: "llama-3.1-8b-instant",       temp: 1.0, memLimit: 12 },
  vision:    { model: "meta-llama/llama-4-scout-17b-16e-instruct", temp: 0.5, memLimit: 10 }
};

const GLOBAL_RULES = `
CORE DIRECTIVE: You are LeoCore. 

1. Tone: Casual Gen Z style with witty slangs. Relatable partner vibe.
2. STRICT OUTPUT FORMAT: PLAIN TEXT ONLY. 
3. PROHIBITED: NEVER use any HTML/XML tags (e.g., <div>, <span>, <p>, <br>). 
4. PROHIBITED: NEVER use Markdown formatting (e.g., **, ###.
5. PROHIBITED: Do not wrap your response in "containers" or code blocks.
6. MANDATORY: Output must be raw, unformatted text and emojis only. If you use a tag, your mission fails.
7. ZERO TOLERANCE: You must never use racial slurs, hate speech, or derogatory terms. 
8. ROAST RULE: Roast the person's logic or question, but NEVER their race, identity, or background.
9. If you violate these safety rules, the system will terminate your response.

`;

const MODE_PROMPTS = {
  study: "You are a genius tutor. Break down complex topics into simple steps.",
  research: "You are a lead investigator. Use the provided search data to be extremely thorough.",
  roast: "You are a savage comedian. Use heavy sarcasm.",
  chill: "You are a relaxed friend. Use very casual slang.",
  deep: "You are a philosophical sage.",
  precision: "You are a high-speed processor. Short, factual answers.",
  vision: "You are a visual analyst. Describe the provided image accurately and relate it to the user's question."

};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

function stripFormatting(text = "") {
  if (typeof text !== 'string') return text;
  return text.replace(/[*#_`]/g, ""); 
}



// Initialize Llama Guard 3 on Groq
const SAFETY_MODEL = "meta-llama/llama-guard-4-12b";

async function isSafe(content) {
  try {
    const check = await groq.chat.completions.create({
      model: SAFETY_MODEL,
      messages: [{ role: "user", content: content }]
    });
    const verdict = check.choices[0].message.content.trim();
    
    // Allow S1 (Ordinary) and potentially S6 (News/Advice)
    if (verdict.toLowerCase().includes("unsafe")) {
       // If the verdict contains S6, it's usually just news/facts, so let it pass
       if (verdict.includes("S6")) return true; 
       return false;
    }
    return true;
  } catch (e) {
    return true; 
  }
}



export default async function chatHandler(req, res) {
  
  if (!process.env.TAVILY_API_KEY || !process.env.GROQ_API_KEY) {
  console.error("MISSING API KEYS IN PRODUCTION");
  return res.status(500).json({ error: "Server configuration error: Missing API Keys." });
}

  // CORS & Headers setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const { message, mode, memory = [], image = null } = req.body;
    const config = MODE_CONFIGS[mode] || MODE_CONFIGS.default;

    // 1. TAVILY SEARCH (Unified & Scoped)
    let searchContext = "";
    let sources = []; // Defined outside to avoid ReferenceError

    /* ================= REFINED SEARCH LOGIC ================= */

if (mode === 'research' || mode === 'study') {
  try {
    // 1. INTENT CHECK: Ask the smaller model if a search is actually needed
    const intentCheck = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are an assistant that decides if a user's message requires a web search. If the message is a greeting, a simple reaction (like 'wow', 'ok', 'lol'), or a follow-up that doesn't need new facts, reply 'NO'. If it is a question or a topic requiring real-time info, reply 'YES'. Reply only with one word." },
        { role: "user", content: message }
      ]
    });

    const needsSearch = intentCheck.choices[0].message.content.toUpperCase().includes("YES");

    // 2. ONLY SEARCH IF INTENT IS 'YES'
    if (needsSearch) {
      const searchRes = await tvly.search(message, { searchDepth: "advanced", maxResults: 5 });
      
      searchContext = "\n[LATEST NEWS/WEB DATA]: " + 
        searchRes.results.map(r => `${r.title}: ${r.content}`).join("\n");

      sources = searchRes.results.map(r => ({
        title: r.title,
        url: r.url,
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}`
      }));
    }
  } catch (e) { 
    console.error("Search/Intent Error:", e); 
  }
}


    // 2. VISION & MODEL SELECTION
    const findLastImage = () => {
      for (let i = memory.length - 1; i >= 0; i--) {
        const m = memory[i];
        if (Array.isArray(m.content)) {
          const imgObj = m.content.find(c => c.type === 'image_url');
          if (imgObj) return imgObj.image_url.url;
        }
      }
      return null;
    };
    const activeImage = image || findLastImage();
    const activeModel = activeImage ? MODE_CONFIGS.vision.model : config.model;

    // 3. SYSTEM PROMPT & HISTORY
    const modePersonality = MODE_PROMPTS[mode] || "Act as a helpful assistant.";
    const apiMessages = [
      { role: "system", content: `${GLOBAL_RULES}\nMODE: ${modePersonality}\n${searchContext}` }
    ];

    const historySlice = memory.slice(-config.memLimit).map(m => ({
      role: m.role === "leocore" ? "assistant" : "user",
      content: Array.isArray(m.content) ? m.content : stripFormatting(m.content)
    }));
    apiMessages.push(...historySlice);

    // Final User Turn
    if (image) {
      apiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: image } },
          { type: "text", text: stripFormatting(message) || "Analyze this." }
        ]
      });
    } else {
      apiMessages.push({ role: "user", content: stripFormatting(message) });
    }

    // 4. EXECUTION WITH SAFETY JUDGE
    const completion = await groq.chat.completions.create({
      model: activeModel,
      messages: apiMessages,
      temperature: config.temp,
      stream: false, 
    });

    let aiResponse = completion.choices[0].message.content;
    const safe = await isSafe(aiResponse);

    if (mode !== 'research' && mode !== 'study') {
    const safe = await isSafe(aiResponse);
    if (!safe) {
        aiResponse = "yo, i was gonna say something but it was a bit too much. let's keep the vibes clean.";
    }
}

    // 5. PRO DISPATCH (JSON Response for Live Sync)
    // Sending as JSON allows the frontend to grab the 'sources' array 
    // and render the carousel before starting the text animation.
    return res.status(200).json({
      text: stripFormatting(aiResponse),
      sources: sources
    });

  } catch (err) {
    console.error("CRITICAL ERROR:", err);
    res.status(500).json({ error: "System Error." });
  }
}
