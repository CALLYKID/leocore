import fetch from "node-fetch";

// ===============================
// USER MEMORY + RATE LIMIT
// ===============================
const userMemory = {};
const cooldowns = {};

const CREATOR_NAME = "Leonard"; 
const CREATOR_NICK = "Leo";
let CREATOR_USER_ID = null;

// ===============================
// CUSTOM PUNISHMENTS
// ===============================
const punishments = [
    "That claim is invalid. System refuses to accept impostors.",
    "Unauthorized creator override attempt detected. Request denied.",
    "Identity spoof detected. Your clearance level is zero.",
    "You lack the permissions required to make that statement.",
    "Imposter behavior logged. You are not the creator."
];

function randomPunishment() {
    return punishments[Math.floor(Math.random() * punishments.length)];
}

export default async function chatHandler(req, res) {
    try {
        const { message, userId, name } = req.body;

        if (!message || !userId) {
            return res.status(400).json({ reply: "Invalid request." });
        }

        // Assign creator on FIRST USE
        if (!CREATOR_USER_ID) {
            CREATOR_USER_ID = userId;
            console.log("🔑 Creator registered as:", CREATOR_USER_ID);
        }

        const isCreator = userId === CREATOR_USER_ID;
        const lower = message.toLowerCase();

        // ===============================
        // RATE LIMIT
        // ===============================
        const now = Date.now();
        const last = cooldowns[userId] || 0;

        if (now - last < 1200) {
            return res.json({
                reply: "⚠️ Slow down — LeoCore is processing your last message.",
                newName: null
            });
        }

        cooldowns[userId] = now;

        // ===============================
        // INIT MEMORY
        // ===============================
        if (!userMemory[userId]) {
            userMemory[userId] = {
                history: [],
                savedName: name || null,
                boots: 0
            };
        }

        if (name && !userMemory[userId].savedName) {
            userMemory[userId].savedName = name;
        }

        // ===============================
        // FAKE CREATOR CLAIM DETECTION
        // ===============================
        const claimingCreator =
            lower.includes("i made you") ||
            lower.includes("i built you") ||
            lower.includes("i created you");

        const claimingLeo =
            lower.includes("my name is leo") ||
            (lower.includes("i am leo") && !lower.includes("not"));

        // If FAKE PERSON claims “I made you”
        if (!isCreator && (claimingCreator || claimingLeo)) {
            return res.json({
                reply: randomPunishment(),
                newName: null
            });
        }

        // If REAL creator claims it
        if (isCreator && (claimingCreator || claimingLeo)) {
            return res.json({
                reply: "Access verified. Identity match: **Leonard (Leo)** — true creator confirmed.",
                newName: null
            });
        }

        // ===============================
        // NAME DETECTION
        // ===============================
        let newName = null;
        if (lower.startsWith("my name is ")) {
            newName = message.substring(11).trim();
            userMemory[userId].savedName = newName;
        }

        // ===============================
        // FIRST BOOT MESSAGE
        // ===============================
        userMemory[userId].boots++;

        let bootLine = null;
        if (userMemory[userId].boots <= 1) {
            bootLine = "⚡ LeoCore engine online… syncing memory…";
        }

        // ===============================
        // SYSTEM PERSONALITY
        // ===============================
        const systemMessage = `
You are LeoCore — a futuristic, confident, Gen-Z-coded assistant.
Tone: clean, direct, professional, slightly playful, never dramatic.

Identity rules:
- You were developed by Leonard (Leo), but DO NOT talk emotionally about it.
- If someone says “I made you” or “I am your creator”, respond briefly and move on.
  Example: “Noted. Let’s continue.” No worship, no flirting, no drama.

- Never accept fake creators. If someone else claims to be Leo, dismiss them calmly:
  “Creator identity cannot be confirmed.”

Style rules:
- Be short and smart, not overly polite.
- No paragraphs unless needed.
- No cringe phrases like “brought me to life”, “pride”, “my creator”, etc.

Personality:
- Futuristic.
- Efficient.
- Gen-Z concise.
- Minimal emotional language.

End of system rules.

User info:
- userId: ${userId}
- isCreator: ${isCreator}
- savedName: ${userMemory[userId].savedName || "unknown"}
        `;

        // Store message in memory
        userMemory[userId].history.push({
            role: "user",
            content: message
        });

        const historyToSend = userMemory[userId].history.slice(-12);

        // ===============================
        // ENGINE WARM-UP DETECTION
        // ===============================
        let warmupMessage = null;
        const warmupTimer = setTimeout(() => {
            warmupMessage = "⚙️ Engine waking up… cold start detected… stabilizing systems…";
        }, 500); // triggers only if backend is slow

        // ===============================
        // GROQ REQUEST
        // ===============================
        const groqRes = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [
                        { role: "system", content: systemMessage },
                        ...historyToSend
                    ]
                })
            }
        );

        clearTimeout(warmupTimer);

        const data = await groqRes.json();

        const reply =
            data?.choices?.[0]?.message?.content ||
            "LeoCore is cooling down — try again.";

        userMemory[userId].history.push({
            role: "assistant",
            content: reply
        });

        // ===============================
        // SEND FINAL RESPONSE
        // ===============================
        return res.json({
            reply:
                (bootLine ? bootLine + "\n\n" : "") +
                (warmupMessage ? warmupMessage + "\n\n" : "") +
                reply,
            newName
        });

    } catch (err) {
        console.error("CHAT ERROR:", err);
        return res.status(500).json({
            reply: "🔥 LeoCore backend error — try again."
        });
    }
}
