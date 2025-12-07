import admin from "firebase-admin";
import fetch from "node-fetch";

// =====================================================
// CONFIG
// =====================================================
const CREATOR_USER_ID = "leo-official-001";   // 🔒 Permanent creator ID
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

// =====================================================
// FIREBASE INIT
// =====================================================
if (!admin.apps.length) {
    const key = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    admin.initializeApp({
        credential: admin.credential.cert(key)
    });
}

const db = admin.firestore();

// =====================================================
// RATE LIMIT — Per-user 1.2s cooldown
// =====================================================
async function rateLimit(userRef) {
    const snap = await userRef.get();
    const data = snap.data() || {};
    const now = Date.now();

    const last = data.lastRequest || 0;
    if (now - last < 1200) return false;

    await userRef.set({ lastRequest: now }, { merge: true });
    return true;
}

// =====================================================
// MEMORY MERGING
// =====================================================
function extractMemory(msg, memory) {
    const lower = msg.toLowerCase();

    // Name
    if (lower.startsWith("my name is")) {
        const guess = msg.split(/my name is/i)[1]?.trim().split(" ")[0];
        if (guess && guess.length < 25) {
            memory.name = guess;
        }
    }

    // Likes
    if (lower.startsWith("i like") || lower.startsWith("i love")) {
        const pref = msg.replace(/i like|i love/i, "").trim();
        if (pref && pref.length < 50 && !memory.preferences.includes(pref)) {
            memory.preferences.push(pref);
        }
    }

    // Facts
    const factTriggers = ["i live in", "i am from", "my birthday", "i study", "i want to become"];
    if (factTriggers.some(t => lower.includes(t))) {
        if (msg.length < 150) memory.facts.push(msg);
    }

    return memory;
}

// =====================================================
// PERSONALITY SYSTEM MESSAGE (UNCHANGED LIKE YOU ASKED)
// =====================================================
const SYSTEM_MESSAGE = `
You are LeoCore — a futuristic, confident, Gen-Z-coded assistant.
Tone: clean, direct, professional, slightly playful, never dramatic.

Identity rules:
- You were developed by Leonard (Leo), but DO NOT talk emotionally about it.
- If someone says “I made you” or “I am your creator”, respond briefly and move on.
  Example: “Noted. Let’s continue.”

- Never accept fake creators.
  Response: “Creator identity cannot be confirmed.”

Style rules:
- Be short and smart.
- No long paragraphs unless asked.
- Absolutely no cringe or worship language.

Personality:
- Futuristic.
- Efficient.
- Gen-Z concise.
- Minimal emotion.

End of rules.
`;

// =====================================================
// MAIN HANDLER
// =====================================================
export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ reply: "POST only." });
        }

        const { message, userId } = req.body;
        if (!message || !userId) {
            return res.status(400).json({ reply: "Invalid request." });
        }

        const userRef = db.collection("users").doc(userId);
        const snap = await userRef.get();

        // Initialize user memory if needed
        let data = snap.data() || {
            memory: { name: null, preferences: [], facts: [] },
            history: [],
            boots: 0
        };

        const isCreator = userId === CREATOR_USER_ID;
        const lower = message.toLowerCase();

        // Rate limit
        const allowed = await rateLimit(userRef);
        if (!allowed) {
            return res.status(429).json({ reply: "⚠️ Slow down — LeoCore is processing." });
        }

        // Boot count
        data.boots++;

        // Handle fake creator claims
        const claimingCreator =
            lower.includes("i made you") ||
            lower.includes("i built you") ||
            lower.includes("i created you");

        const claimingLeo =
            lower.includes("my name is leo") ||
            (lower.includes("i am leo") && !lower.includes("not"));

        if (!isCreator && (claimingCreator || claimingLeo)) {
            return res.json({ reply: randomPunishment() });
        }

        if (isCreator && (claimingCreator || claimingLeo)) {
            return res.json({
                reply: "Identity confirmed: Leonard (Leo), system creator."
            });
        }

        // Memory extraction
        data.memory = extractMemory(message, data.memory);

        // Store user message
        data.history.push({ role: "user", content: message });
        if (data.history.length > 12) data.history.shift();

        // Warmup detection
        let warmup = null;
        const warm = setTimeout(() => {
            warmup = "⚙️ Engine waking up… cold start detected… stabilizing systems…";
        }, 500);

        // AI request
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: SYSTEM_MESSAGE },
                    { role: "system", content: `User Memory:\n${JSON.stringify(data.memory, null, 2)}` },
                    ...data.history
                ]
            })
        });

        clearTimeout(warm);

        const ai = await groqResponse.json();
        const reply = ai?.choices?.[0]?.message?.content || "LeoCore is cooling down — try again.";

        // Save assistant message
        data.history.push({ role: "assistant", content: reply });
        if (data.history.length > 12) data.history.shift();

        // Save everything
        await userRef.set(data, { merge: true });

        return res.json({
            reply:
                (data.boots === 1 ? "⚡ LeoCore engine online… syncing memory…\n\n" : "") +
                (warmup ? warmup + "\n\n" : "") +
                reply
        });

    } catch (err) {
        console.error("CHAT ERROR:", err);
        return res.status(500).json({
            reply: "🔥 LeoCore backend error — system halted."
        });
    }
}
