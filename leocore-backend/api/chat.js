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
    "Imposter behavior logged. You are not the creator."
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
You are LeoCore — a clean, fast, Gen-Z coded AI.
Short replies. Modern tone. Match user vibe.
No cringe. No paragraphs unless needed.
`;

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

        /* =====================================================
           FAST KEEP-ALIVE
        ====================================================== */
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
            return res.status(429).json({ reply: "⚠️ Slow down — LeoCore is processing." });
        }

        data.boots++;

        /* =====================================================
           CREATOR LOGIC
        ====================================================== */
        if (!isCreator &&
            (lower.includes("i made you") ||
             lower.includes("i built you") ||
             lower.includes("i created you"))) {
            return res.json({ reply: randomPunishment() });
        }

        if (isCreator &&
            (lower.includes("i made you") ||
             lower.includes("i built you") ||
             lower.includes("i created you"))) {
            return res.json({ reply: "Identity confirmed: Leonard (Leo), system creator." });
        }

        /* =====================================================
           MEMORY SYSTEM
        ====================================================== */
        data.memory = extractMemory(message, data.memory);

        data.history.push({ role: "user", content: message });
        if (data.history.length > 8) data.history.shift(); // faster

        /* =====================================================
           AI REQUEST — OPTIMIZED
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
        const reply =
            ai?.choices?.[0]?.message?.content || "LeoCore is cooling down — try again.";

        data.history.push({ role: "assistant", content: reply });
        if (data.history.length > 8) data.history.shift();

        await userRef.set(data, { merge: true });

        return res.json({
            reply:
                (data.boots === 1 ? "⚡ LeoCore engine online… syncing memory…\n\n" : "") +
                reply
        });

    } catch (err) {
        console.error("CHAT ERROR:", err);
        return res.status(500).json({ reply: "🔥 LeoCore backend error — system halted." });
    }
}

/* =====================================================
   GLOBAL KEEP-ALIVE (5 MIN)
===================================================== */
setInterval(() => {
    fetch("https://leocore.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "__ping__", userId: "system-keepalive" })
    }).catch(() => {});
}, 300000);
