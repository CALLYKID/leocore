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
`;

const MODE_PROMPTS = {
  study: "You are a genius tutor. Break down complex topics into simple steps.",
  research: "You are a lead investigator. Use the provided search data to be extremely thorough.",
  roast: "You are a savage comedian. Use heavy sarcasm.",
  chill: "You are a relaxed friend. Use very casual slang.",
  deep: "You are a philosophical sage.",
  precision: "You are a high-speed processor. Short, factual answers."
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

function stripFormatting(text = "") {
  if (typeof text !== 'string') return text;
  return text.replace(/[*#_`]/g, ""); 
}

export default async function chatHandler(req, res) {
  // CORS setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const { message, mode, memory = [], image = null } = req.body;
    const config = MODE_CONFIGS[mode] || MODE_CONFIGS.default;

    // 1. TAVILY SEARCH (Research/Study Mode)
    let searchContext = "";
    if (mode === 'research' || mode === 'study') {
      try {
        const searchRes = await tvly.search(message, { searchDepth: "advanced", maxResults: 5 });
        searchContext = "\n[LATEST NEWS/WEB DATA]: " + 
          searchRes.results.map(r => `${r.title}: ${r.content}`).join("\n");
      } catch (e) { console.error("Tavily Error:", e); }
    }

    // 2. VISION CHECK
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

    // 3. SYSTEM PROMPT ASSEMBLY
    const modePersonality = MODE_PROMPTS[mode] || "Act as a helpful assistant.";
    const apiMessages = [
      { 
        role: "system", 
        content: `${GLOBAL_RULES}\nMODE: ${modePersonality}\n${searchContext}` 
      }
    ];

    // 4. HISTORY & FINAL TURN
    const historySlice = memory.slice(-config.memLimit).map(m => ({
      role: m.role,
      content: Array.isArray(m.content) ? m.content : stripFormatting(m.content)
    }));
    apiMessages.push(...historySlice);

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

    // 5. EXECUTION
    const completion = await groq.chat.completions.create({
      model: activeModel,
      messages: apiMessages,
      temperature: config.temp,
      stream: true,
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content || "";
      res.write(stripFormatting(text));
    }
    res.end();

  } catch (err) {
    console.error("CRITICAL ERROR:", err);
    res.status(500).send("System Error.");
  }
}
