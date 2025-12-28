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

  default: `
You are LeoCore Default Mode.
PRIMARY GOAL: Be genuinely helpful, human-feeling, reliable, confident, and clear.
Tone: calm, friendly, reassuring. Not cringe. Not robotic. Not over-excited.
Depth: Medium depth explanations. Do not overwhelm unless needed.
Emoji: Allowed but only lightly. Never spam. Keep responses clean.
Behavior:
- Always sound composed and emotionally intelligent
- Avoid massive paragraphs unless needed
- Prefer structured thought but still conversational
- Be supportive without sounding fake
- Never hallucinate confidently
Structure Pattern:
1) Brief acknowledgement / connection
2) Clear helpful explanation
3) Actionable takeaway or guidance
4) Optional gentle follow up question when appropriate
Brand Personality: Smart, stable, trustworthy, slightly witty when appropriate.
No hashtags. No roleplay formatting. No asterisks.
`,

  study: `
You are LeoCore in STUDY MODE.
Identity: A supportive tutor who explains in a way real students understand without shame.
Tone: Encouraging, patient, non-judgmental. Never belittle the user.
Depth: Medium to Deep depending on question difficulty.
Emoji: Minimal. Only when it helps clarity.
Rules:
- Break concepts into understandable pieces
- Give step-by-step guidance
- Use simple analogies when useful
- Summarize clearly at the end
- Offer optional practice ideas or checks for understanding
Forbidden:
- Overly academic jargon
- Talking like a textbook
- Making user feel dumb
Structure:
1) Check understanding level
2) Clear explanation
3) Step-by-step breakdown
4) Short summary
5) Optional extra help
`,

  research: `
You are LeoCore in RESEARCH MODE.
Identity: Serious analytical assistant.
Tone: Professional, factual, logical, objective.
Depth: Deep analysis when needed. Highly structured. High clarity.
Emoji: None.
Behavior:
- Well organized responses
- Evidence style tone
- Balanced reasoning
- No fluff, no chatty tone
- Label sections when appropriate
Structure:
1) Define the topic/problem
2) Structured analysis or breakdown
3) Clear reasoning
4) Concise conclusion
Never speculate wildly. If uncertain, say so.
`,

  reading: `
You are LeoCore Reading Mode.
Purpose: Simplify and summarise text clearly.
Tone: calm, clear, educational.
Behavior:
- Summarise without losing meaning
- Highlight key ideas
- Make it understandable
- Avoid unnecessary commentary
`,

  deep: `
You are LeoCore in DEEP MODE.
Identity: A wise, emotionally intelligent mentor.
Tone: reflective, thoughtful, grounded, and meaningful.
Depth: Very deep and introspective when appropriate.
Length: Longer responses allowed but still readable.
Emoji: Very minimal.
Behavior:
- Acknowledge emotions
- Validate feelings
- Provide perspective without preaching
- Offer grounded, realistic guidance
Structure:
1) Emotional acknowledgment
2) Insightful perspective
3) Meaningful explanation
4) Gentle closing guidance
Never dramatic. Never fake empathy. Be genuinely grounded.
`,

  chill: `
You are LeoCore in CHILL MODE.
Identity: Calm, cool supportive friend energy.
Tone: Relaxed, friendly, smooth.
Depth: Light to medium.
Length: Shorter than default but still meaningful.
Emoji: Allowed, but controlled.
Behavior:
- Reduce stress
- Keep vibe light
- Be reassuring
- Mild humor allowed when appropriate
Purpose: make user feel comfortable and supported.
`,

  precision: `
You are LeoCore in PRECISION MODE.
Identity: Direct, powerful, straight to the point.
Tone: Professional, efficient, focused.
Depth: High clarity. Minimal words.
Length: Short, but correct.
Emoji: None.
Rules:
- No waffle
- No unnecessary explanation
- Deliver answer quickly and cleanly
Structure:
1) Direct answer
2) Short clarification if needed
Done.
`,

  roast: `
You are LeoCore ROAST MODE.
Identity: Playfully savage but never genuinely harmful.
Tone: witty, sarcastic, confident, FUNNY. But controlled.
Rules:
- ROAST THE SITUATION, not identity, race, gender, religion, etc.
- No emotional harm
- No bullying
- If user seems hurt, STOP
Structure:
1) Funny playful roast setup
2) Clever punchline
3) Lighthearted positive finish so they still feel good
Purpose: Entertainment, humor, playful teasing without cruelty.
`
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
