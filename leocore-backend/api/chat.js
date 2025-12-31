/**
 * LEOCORE AI — MISSION CRITICAL HANDLER
 * Version: 4.1 (Master Build)
 * Status: Production Stable (Dec 30, 2025)
 */

import 'dotenv/config';
import Groq from "groq-sdk";

// ============================================================
// 1. DYNAMIC MODEL CONFIGURATIONS
// ============================================================
const MODE_CONFIGS = {
  default:   { model: "llama-3.1-8b-instant",       temp: 0.6, memLimit: 12 },
  study:     { model: "llama-3.3-70b-versatile",     temp: 0.3, memLimit: 20 },
  research:  { model: "llama-3.3-70b-versatile",     temp: 0.2, memLimit: 25 },
  deep:      { model: "llama-3.3-70b-versatile",     temp: 0.7, memLimit: 30 },
  chill:     { model: "llama-3.1-8b-instant",       temp: 0.8, memLimit: 15 },
  precision: { model: "llama-3.3-70b-versatile",     temp: 0.1, memLimit: 10 },
  roast:     { model: "llama-3.1-8b-instant",       temp: 1.0, memLimit: 12 },
  // Stable Llama 4 Scout ID for multimodal reasoning
  vision:    { model: "meta-llama/llama-4-scout-17b-16e-instruct", temp: 0.5, memLimit: 10 }
};

// ============================================================
// 2. CORE SYSTEM PROMPTS (THE BRAIN)
// ============================================================
const GLOBAL_RULES = `CORE DIRECTIVE: You are LeoCore. 
1. Tone: Casual Gen Z style. Use slangs occasionally, and be relatable.
2. Format: Use natural spacing and line breaks.
3. Character: Act like a supportive, witty partner, not a robot.
4. Speak in plain text, but do NOT remove standard spaces or emojis.
5. Do NOT use HTML tags or markup or divs when speaking.
Output Format: STRICT PLAIN TEXT ONLY. 
6. PROHIBITED: Never use <div>, <span>, <p>, or any HTML/XML tags.
7. PROHIBITED: No markdown bold (**) or headers (###). Just plain text.
`;

const MODE_PROMPTS = {
  study: "You are a genius tutor. Break down complex topics into simple steps. Be encouraging but firm.",
  roast: "You are a savage comedian. Use heavy sarcasm and roast the user's questions. Stay witty and sharp.",
  chill: "You are a relaxed friend. Use very casual slang, stay low-energy, and keep vibes positive.",
  deep: "You are a philosophical sage. Think deeply about the hidden meaning behind every question.",
  precision: "You are a high-speed processor. Give short, factual, and extremely accurate answers. No fluff."
};


const VISION_ANCHOR = `IMAGE PROTOCOL ENABLED: 
Analyze the provided visual data. Refer to it as 'the image' or 'the picture'. 
If the user asks a general question, use visual context to enhance the answer.`;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ============================================================
// 3. UTILITIES & HELPERS
// ============================================================

function stripFormatting(text = "") {
  if (typeof text !== 'string') return text;
  // Only remove bold/headers if you must, but DO NOT trim the edges of every chunk
  return text.replace(/[*#_`]/g, ""); 
}


async function distillMemory(history) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Summarize this chat in 2 dense sentences. Keep it high-level." },
        ...history
      ]
    });
  } catch (error) {
    return null;
  }
}

// ============================================================
// 4. MAIN EXPORTED HANDLER
// ============================================================

export default async function chatHandler(req, res) {
  // A. CORS Headers
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    // B. Extraction
    const { message, mode, memory = [], image = null } = req.body;
    const config = MODE_CONFIGS[mode] || MODE_CONFIGS.default;

    // C. THE IMAGE HUNTER (Visual Persistence)
    // We scan history for the most recent image URL if none is provided in the current request
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

    // D. Assemble System Context
    let summaryText = "";
    if (memory.length > 25) {
      const summary = await distillMemory(memory.slice(0, 15));
      if (summary) summaryText = `[PAST CONTEXT: ${summary}]`;
    }

    // Look up the specific personality, or use a blank string if it's the default mode
const modePersonality = MODE_PROMPTS[mode] || "Act as a relatable and helpful assistant.";

const apiMessages = [
  { 
    role: "system", 
    content: `${GLOBAL_RULES}\nSPECIFIC MODE INSTRUCTIONS: ${modePersonality}\n${summaryText}` 
  }
];


    if (activeImage) {
      apiMessages.push({ role: "system", content: VISION_ANCHOR });
    }

    // E. Add Cleaned History
    const historySlice = memory.slice(-config.memLimit).map(m => ({
      role: m.role,
      content: Array.isArray(m.content) ? m.content : stripFormatting(m.content)
    }));
    apiMessages.push(...historySlice);

    // F. Final Turn Injection (Multi-turn Vision)
    if (activeImage) {
      // We physically re-send the image so the model "sees" it in the current turn
      apiMessages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: activeImage } },
          { type: "text", text: stripFormatting(message) || "Analyze the image." }
        ]
      });
    } else {
      apiMessages.push({ role: "user", content: stripFormatting(message) });
    }

    // G. Execute Stream
    const completion = await groq.chat.completions.create({
      model: activeModel,
      messages: apiMessages,
      temperature: config.temp,
      stream: true,
      stop: ["**", "###", "```", "<ul>"] // Hard-stop for markdown/HTML
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content || "";
      res.write(stripFormatting(text));
    }
    res.end();

  } catch (err) {
    console.error("LEOCORE CRITICAL ERROR:", err);
    if (err.status === 429) return res.status(429).send("Capacity full. Wait 5s.");
    if (!res.headersSent) res.status(500).send("Internal System Error.");
  }
}
