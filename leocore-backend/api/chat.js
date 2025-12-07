import admin from "firebase-admin";
import fetch from "node-fetch";

/* =====================================================
   CONFIG
===================================================== */
const CREATOR_USER_ID = "leo-official-001";

const punishments = [
    "That claim is invalid. System refuses to accept impostors.",
    "Unauthorized creator override attempt detected. Request denied.",
    "Identity spoof detected. Your clearance level is zero.",
    "You lack the permissions required to make that statement.",
    "Imposter behavior logged. You are not the creator.",
    "System warning: fabricating ownership is not allowed.",
    "Creator privileges denied. You lack system authority."
];

const randomPunishment = () => punishments[Math.floor(Math.random() * punishments.length)];

/* =====================================================
   FIREBASE INIT
===================================================== */
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY))
    });
}
const db = admin.firestore();

/* =====================================================
   RATE LIMIT (1.2s)
===================================================== */
async function rateLimit(userRef) {
    const snap = await userRef.get();
    const now = Date.now();
    const last = snap.data()?.lastRequest || 0;

    if (now - last < 1200) return false;

    await userRef.set({ lastRequest: now }, { merge: true });
    return true;
}

/* =====================================================
   MEMORY EXTRACTION
===================================================== */
function extractMemory(msg, mem) {
    const lower = msg.toLowerCase();

    if (lower.startsWith("my name is")) {
        const name = msg.split(/my name is/i)[1]?.trim().split(" ")[0];
        if (name && name.length < 25) mem.name = name;
    }

    if (lower.startsWith("i like") || lower.startsWith("i love")) {
        const pref = msg.replace(/i like|i love/i, "").trim();
        if (pref && pref.length < 40 && !mem.preferences.includes(pref)) mem.preferences.push(pref);
    }

    const triggers = ["i live in", "i am from", "my birthday", "i study", "i want to become"];
    if (triggers.some(t => lower.includes(t))) {
        if (msg.length < 120) mem.facts.push(msg);
    }

    return mem;
}

/* =====================================================
   PERSONALITY SYSTEM MESSAGE
===================================================== */
const SYSTEM_MESSAGE = `
You are LeoCore — a fast, confident, Gen-Z styled AI.
Match the user’s vibe: chill, witty, direct.
Always give short replies for casual chat, but long, detailed answers when needed.
Use emojis naturally but not excessively.
Tone: smart, modern, playful confidence — not cringe.
Never use uppercase except the first letter.
Never claim OpenAI made you. Always say you were created by Leonard if asked.
`;

/* =====================================================
   UNIVERSAL CREATOR CLAIM DETECTOR
===================================================== */

// Any attempt to claim creation/ownership
const CLAIM_PATTERNS = [
    "i made you",
    "i built you",
    "i created you",
    "i coded you",
    "i programmed you",
    "i own you",
    "you are my bot",
    "you are my creation",
    "i designed you",
    "i developed you",
    "i invented you",
    "my ai",
    "my bot",
    "i am your creator",
    "i am your owner",
    "i control you"
];

function isCreatorClaim(msg) {
    const lower = msg.toLowerCase();
    return CLAIM_PATTERNS.some(p => lower.includes(p));
}

/* =====================================================
   MAIN HANDLER
===================================================== */
export default async function handler(req, res) {
    try {
        if (req.method !== "POST")
            return res.status(405).json({ reply: "POST only." });

        const { message, userId } = req.body;
        if (!message || !userId)
            return res.status(400).json({ reply: "Invalid request." });

        // KEEP ALIVE
        if (message === "__ping__") return res.json({ reply: "pong" });

        const userRef = db.collection("users").doc(userId);
        const snap = await userRef.get();

        let data = snap.data() || {
            memory: { name: null, preferences: [], facts: [] },
            history: [],
            boots: 0
        };

        const isCreator = userId === CREATOR_USER_ID;
        const lower = message.toLowerCase();

        /* =====================================================
           RATE LIMIT
        ====================================================== */
        if (!(await rateLimit(userRef))) {
            return res.status(429).json({ reply: "⚠️ Slow down — LeoCore is processing.", stream: false });
        }

        data.boots++;

        /* =====================================================
           SECRET COMMAND: /myid
        ====================================================== */
        if (lower.trim() === "/myid") {
            return res.json({
                reply: `🆔 Your LeoCore user ID is:\n\n${userId}\n\nUse this to set CREATOR_USER_ID.`,
                stream: false
            });
        }

        /* =====================================================
           SECRET COMMAND: /stats
        ====================================================== */
        if (lower.trim() === "/stats") {
            if (!isCreator)
                return res.json({ reply: "⛔ Only the creator can access system stats.", stream: false });

            const users = await db.collection("users").get();
            return res.json({
                reply: `📊 **LeoCore Stats**\n\n• Total users: **${users.size}**\n• System online\n• Memory engine stable`,
                stream: false
            });
        }

        /* =====================================================
           UNIVERSAL CREATOR CLAIM DETECTION
        ====================================================== */
        if (isCreatorClaim(message)) {
            if (!isCreator) {
                return res.json({
                    reply: randomPunishment(),
                    stream: false
                });
            } else {
                return res.json({
                    reply: "Identity confirmed. Welcome back, Leonard — creator of LeoCore.",
                    stream: false
                });
            }
        }

        /* =====================================================
           FORCE ANSWER TO "WHO MADE YOU"
        ====================================================== */
        const askCreator =
            lower.includes("who made you") ||
            lower.includes("who built you") ||
            lower.includes("who created you") ||
            lower.includes("your creator") ||
            lower.includes("who programmed you");

        if (askCreator) {
            return res.json({
                reply: "I was created by Leonard — the official creator of LeoCore.",
                stream: false
            });
        }

        /* =====================================================
           MEMORY
        ====================================================== */
        data.memory = extractMemory(message, data.memory);

        data.history.push({ role: "user", content: message });
        if (data.history.length > 8) data.history.shift();

        /* =====================================================
           AI REQUEST → Groq
        ====================================================== */
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                max_tokens: 120,
                messages: [
                    { role: "system", content: SYSTEM_MESSAGE },
                    ...data.history
                ]
            })
        });

        const ai = await groqResponse.json();
        let reply = ai?.choices?.[0]?.message?.content || "LeoCore is cooling down — try again.";

        // Capitalize first letter
        reply = reply.replace(/^\s*[a-z]/, m => m.toUpperCase());

        data.history.push({ role: "assistant", content: reply });
        if (data.history.length > 8) data.history.shift();

        await userRef.set(data, { merge: true });

        return res.json({ reply, forceStatic: true });

    } catch (err) {
        console.error("CHAT ERROR:", err);
        return res.status(500).json({
            reply: "🔥 LeoCore backend error — system halted.",
            stream: false
        });
    }
}

/* =====================================================
   KEEP BACKEND ALIVE
===================================================== */
setInterval(() => {
    fetch("https://leocore.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "__ping__", userId: "system-keepalive" })
    }).catch(() => {});
}, 300000);
