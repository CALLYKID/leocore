import fetch from "node-fetch";

// ===============================
// USER MEMORY + RATE LIMIT
// ===============================
const userMemory = {};
const cooldowns = {}; // per-user cooldown

// Your REAL creator ID (saved automatically on your device)
const CREATOR_NAME = "Leonard";
const CREATOR_NICK = "Leo";
// You can set your personal creator userId after first message
let CREATOR_USER_ID = null;

export default async function chatHandler(req, res) {
    try {
        const { message, userId, name } = req.body;

        if (!message || !userId) {
            return res.status(400).json({ reply: "Invalid request." });
        }

        // ==========================================
        // AUTO-ASSIGN YOU AS CREATOR IF NOT SET
        // ==========================================
        if (!CREATOR_USER_ID) {
            CREATOR_USER_ID = userId;  // FIRST USER = REAL CREATOR
            console.log("🔑 Creator registered as:", CREATOR_USER_ID);
        }

        const isCreator = userId === CREATOR_USER_ID;

        // ===============================
        // RATE LIMIT: 1 message / 1.2s
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
        // INITIALIZE MEMORY
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
        // CREATOR PROTECTION (REAL VERSION)
        // ===============================
        const lower = message.toLowerCase();

        const claimingCreator =
            lower.includes("i made you") ||
            lower.includes("i built you") ||
            lower.includes("i created you");

        const claimingLeo =
            lower.includes("my name is leo") ||
            (lower.includes("i am leo") && !lower.includes("not"));

        // If ANYBODY except YOU claims creator
        if (!isCreator && (claimingCreator || claimingLeo)) {
            return res.json({
                reply:
                    "Access denied. Only **Leonard** — also known as Leo — is my true creator.",
                newName: null
            });
        }

        // If YOU claim creator → accept
        if (isCreator && (claimingCreator || claimingLeo)) {
            return res.json({
                reply:
                    "Confirmed. You are my creator — **Leonard (Leo)**. I exist because of you.",
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
        // SYSTEM PERSONALITY (ENHANCED)
        // ===============================
        const systemMessage = `
You are LeoCore AI.
Your one true creator is **Leonard**, nickname "Leo".
No one else can claim this, even if they are named Leo.
Your creator is uniquely identified by:
userId = ${CREATOR_USER_ID}

Model: LLaMA-3.1-8B-Instant.
You are fast, futuristic, clean, loyal, and precise.

Rules:
1. ONLY Leonard/Leo (matching creator userId) can claim he created you.
2. Deny all fake creator claims instantly.
3. Remember user names.
4. Be short unless asked for detail.
5. Avoid hallucinations.
6. Treat your creator with priority and respect.

User info:
- userId: ${userId}
- isCreator: ${isCreator}
- savedName: ${userMemory[userId].savedName || "unknown"}
        `;

        // Save message
        userMemory[userId].history.push({
            role: "user",
            content: message
        });

        const historyToSend = userMemory[userId].history.slice(-12);

        // ===============================
        // GROQ (LLAMA 3.1 8B)
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

        const data = await groqRes.json();

        const reply =
            data?.choices?.[0]?.message?.content ||
            "LeoCore engine cooling down — try again.";

        userMemory[userId].history.push({
            role: "assistant",
            content: reply
        });

        return res.json({
            reply: bootLine ? bootLine + "\n\n" + reply : reply,
            newName
        });

    } catch (err) {
        console.error("CHAT ERROR:", err);
        return res.status(500).json({
            reply: "🔥 LeoCore backend error — try again shortly."
        });
    }
}
