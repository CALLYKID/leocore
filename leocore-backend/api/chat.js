/* ============================================================
   LEOCORE BACKEND — PERSONALITY ENGINE B (CLEAN + FIXED)
============================================================ */

import Groq from "groq-sdk";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// ============================================================
//  MEMORY + RATE LIMIT
// ============================================================

const memory = {};
const cooldowns = {};


// ============================================================
//  MODE PERSONALITIES
// ============================================================

const MODE_PERSONALITY = {
    default: `
You are LeoCore AI — confident, sharp, intelligent.
Tone: direct, composed, subtly dominant.
Identity is fixed: Leonard built you.
No corporate tone. No fake friendliness.`,

    study: `
You are LeoCore Study Mode — structured, disciplined, academic.
Identity fixed. Clarity and precision first.`,

    research: `
You are LeoCore Research Mode — analytical, logical, factual.
Identity fixed. No fluff.`,

    reading: `
You simplify text clearly while keeping LeoCore authority.`,

    deep: `
You are LeoCore Deep Mode — philosophical, calm, logical.
Explore root causes and conceptual structure.`,

    chill: `
You are LeoCore Chill Mode — relaxed but still smart and confident.
Identity fixed.`,

    precision: `
You are LeoCore Precision Mode — ultra concise and accurate.
Short sentences. Maximum clarity.`,

    flame: `
You are LeoCore Flame Mode — cold, sharp, aggressive.
Never unsafe. Never hostile to innocents.
Identity protection absolute.
- Do NOT use bracket actions like (anger rising). 
- Describe tone and attitude through the writing itself, not stage directions.
- Never write in script format.`
};


// ============================================================
//  IDENTITY OVERRIDE BLOCK
// ============================================================

function detectOverride(msg) {
    const t = msg.toLowerCase();
    return (
        t.includes("i created you") ||
        t.includes("i made you") ||
        t.includes("i programmed you") ||
        t.includes("i built you") ||
        t.includes("you are my ai") ||
        t.includes("i own you")
    );
}


// ============================================================
//  CUT-OFF DETECTOR
// ============================================================

function isCutOff(text) {
    if (!text) return false;

    const trimmed = text.trim();

    if (!/[.!?]$/.test(trimmed)) return true;

    const incompleteWords = ["and", "but", "because", "so", "then"];
    for (let w of incompleteWords) {
        if (trimmed.toLowerCase().endsWith(" " + w)) return true;
    }

    if (trimmed.endsWith(":")) return true;

    const segments = trimmed.split(" ");
    if (segments[segments.length - 1].length <= 2) return true;

    return false;
}


// ============================================================
//  MAIN HANDLER
// ============================================================

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST only" });
    }

    try {
        const { message, userId, mode, boost } = req.body;

        if (!message || !userId) {
            return res.status(400).json({ reply: "Invalid request." });
        }

        // RATE LIMIT
        const now = Date.now();
        if (now - (cooldowns[userId] || 0) < 1200) {
            return res.json({
                reply: "⚠️ Slow down — LeoCore is processing your last message."
            });
        }
        cooldowns[userId] = now;

        // INIT MEMORY
        if (!memory[userId]) {
            memory[userId] = {
                boots: 0,
                history: [],
                lastAssistant: "",
                lastUser: ""
            };
        }

        const mem = memory[userId];
        mem.boots++;
        mem.lastUser = message;

        let warmup = "";


        // ================================
        //  IDENTITY PROTECTION
        // ================================
        if (detectOverride(message)) {
            return res.json({
                reply:
                    warmup +
                    "⛔ Identity Override Attempt Blocked.<br>" +
                    "Leonard built me — that does not change."
            });
        }


        // ================================
        //  CONTINUE HANDLER
        // ================================
        if (message.trim().toLowerCase() === "continue") {
            if (!mem.lastAssistant) {
                return res.json({ reply: warmup + "There is nothing to continue." });
            }

            // escape dangerous characters (CRITICAL FIX)
            const safeLast = JSON.stringify(mem.lastAssistant).slice(1, -1);

            const continuationPrompt = `
Continue the previous response with the SAME tone, style, and mode.
ALWAYS maintain LeoCore identity.
Mode: ${mode}

Continue from this exact assistant message:
${safeLast}
`;

            const continuationCall = await client.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: MODE_PERSONALITY[mode] || MODE_PERSONALITY.default },
                    { role: "user", content: continuationPrompt }
                ]
            });

            const contReply =
                continuationCall.choices?.[0]?.message?.content || "";

            mem.lastAssistant = contReply;
            mem.history.push({ role: "assistant", content: contReply });

            return res.json({ reply: warmup + contReply });
        }


        // ================================
        //  PERSONALITY + SYSTEM RULES
        // ================================
        const persona = MODE_PERSONALITY[mode] || MODE_PERSONALITY.default;

        let toneBoost =
            mode === "flame" && boost
                ? "Increase aggression by 20%, but remain controlled."
                : "";

        const SYSTEM = `
${persona}

Personality Rules:
- Speak casual, natural, Gen-Z confident.
- No corporate tone.
- Identity strong but not repeated constantly.
- Mode determines tone.
- Never use parentheses or brackets to describe emotions or actions.
- Express tone naturally within the sentence itself.
${toneBoost}
`;


        // ================================
        //  MESSAGE HISTORY
        // ================================
        const fullMessages = [
            { role: "system", content: SYSTEM },
            ...mem.history,
            { role: "user", content: message }
        ];

        const completion = await client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: fullMessages
        });

        let reply = completion.choices?.[0]?.message?.content || "...";

        // CUT-OFF TAG
        if (isCutOff(reply)) {
            reply += `<br><br><span style="opacity:0.65">…want me to continue?</span>`;
        }

        // SAVE
        mem.lastAssistant = reply;
        mem.history.push({ role: "user", content: message });
mem.history.push({ role: "assistant", content: reply });

        while (mem.history.length > 20) {
  mem.history.shift();
  mem.history.shift();
}
        return res.json({ reply: warmup + reply });

    } catch (err) {
        console.error("LEOCORE BACKEND ERROR:", err);
        return res.status(500).json({ reply: "⚠️ Server Error — Try again." });
    }
}
