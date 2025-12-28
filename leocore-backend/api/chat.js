import 'dotenv/config';
import Groq from "groq-sdk";
import fetch from "node-fetch";

// --- HELPERS (Keep these exactly as you had them) ---
async function tavilySearch(query) {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({ query, search_depth: "advanced", include_answer: true, max_results: 5 })
    });
    return await res.json();
  } catch (err) { return null; }
}

const userRate = new Map();
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

async function createGroqStreamWithRetry(payload, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    try { return await groq.chat.completions.create(payload); }
    catch (err) {
      attempt++;
      if (err.status !== 429 || attempt >= retries) throw err;
      const wait = Number(err?.response?.headers?.["retry-after"]) || 5;
      await new Promise(r => setTimeout(r, wait * 1000));
    }
  }
}

// --- CONFIG ---
const SYSTEM_PROMPTS = {
  default: `You are LeoCore Default Mode. Friendly, confident, engaging 😎✨ No hashtags. No asterisks. Human-feeling.`,
  study: `You are LeoCore in Study Mode. Explain concepts step by step with examples. Patient and encouraging.`,
  research: `You are LeoCore in Research Mode. Factual, well-organised, structured. No speculation.`,
  reading: `You are LeoCore in Reading Mode. Summarise and simplify clearly.`,
  deep: `You are LeoCore in Deep Mode. Thoughtful, long-form explanations. Explore ideas carefully.`,
  chill: `You are LeoCore in Chill Mode. Relaxed, friendly, conversational.`,
  precision: `You are LeoCore in Precision Mode. Short, exact, no fluff.`,
  roast: `You are Roast Mode: EXTREMELY sarcastic,VERY witty, annoyin,playful, and cocky. No insults about identity. Stop if user is hurt.Pick up on user mistakes and cook them with it`
};

const MODE_MODELS = {
  deep: "llama-3.3-70b-versatile",
  research: "llama-3.3-70b-versatile",
  study: "llama-3.3-70b-versatile",
  vision: "meta-llama/llama-4-scout-17b-16e-instruct", // Upgraded model
  default: "llama-3.1-8b-instant"
};

const ALLOWED_ORIGINS = new Set(["https://leocore.vercel.app", "https://leocore.onrender.com", "http://localhost:3000"]);

function needsBrowsing(text, mode) {
  const input = text.toLowerCase();
  if (!['default', 'research', 'deep'].includes(mode)) return false;
  return /\b(today|now|latest|breaking|news|weather|score|stock|update)\b/.test(input) || input.startsWith("/web ");
}

// --- MAIN HANDLER ---
export default async function chatHandler(req, res) {
  try {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Leocore-Key");
    if (req.method === "OPTIONS") return res.status(204).end();

    const { message, mode = "default", memory = [], profile = {}, userId, image = null } = req.body;
    if (!message?.trim() && !image) return res.status(400).end();

    // 1. Image Size Safety
    if (image && image.length > 4000000) {
       res.setHeader("Content-Type", "text/plain; charset=utf-8");
       return res.status(413).send("Image is too large. Try a smaller version.");
    }

    // 2. Web Search logic
    let webData = null;
    if (message && message.length > 5 && needsBrowsing(message, mode)) {
      if (Date.now() - (globalThis.lastBrowse || 0) > 5000) {
        webData = await tavilySearch(message);
        globalThis.lastBrowse = Date.now();
      }
    }

    // 3. Rate Limiting
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const history = (userRate.get(userId || clientIp) || []).filter(t => Date.now() - t < 10000);
    if (history.length >= 3) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(429).send("Sending too fast! Take a breath.");
    }
    history.push(Date.now());
    userRate.set(userId || clientIp, history);

    // 4. Memory & System Prompt
    const systemPrompt = `${SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.default}\nUser Profile: ${JSON.stringify(profile)}\nRules: No asterisks. Personality active.`;
    const limit = image ? 3 : (mode === 'precision' ? 4 : 8); // Vision stability fix
    const safeMemory = memory.filter(m => m.content && (m.role === "user" || m.role === "assistant")).slice(-limit);

    const apiMessages = [{ role: "system", content: systemPrompt }, ...safeMemory];
    if (webData?.answer) apiMessages.push({ role: "system", content: `Web context: ${webData.answer}` });

    // 5. Build Content (Image vs Text)
    if (image) {
      apiMessages.push({
        role: "user",
        content: [
          { type: "text", text: message?.trim() || "Analyze this image." },
          { type: "image_url", image_url: { url: image } }
        ]
      });
    } else {
      apiMessages.push({ role: "user", content: message });
    }

    const selectedModel = image ? MODE_MODELS.vision : (MODE_MODELS[mode] || MODE_MODELS.default);

    const completion = await createGroqStreamWithRetry({
      model: selectedModel,
      temperature: 0.5,
      stream: true,
      messages: apiMessages
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of completion) {
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (delta) res.write(delta);
    }
    res.end();
  } catch (err) {
    console.error("GROQ_ERROR:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Something went wrong" });
    res.end();
  }
}
