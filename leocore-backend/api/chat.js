import admin from "firebase-admin";
import fetch from "node-fetch";

/* =====================================================
   CONFIG
===================================================== */
const CREATOR_USER_ID = "leo-official-001";

const punishments = [
    "⛔ Unauthorized creator claim detected.",
    "⚠️ Identity spoof blocked.",
    "❌ Permission level insufficient.",
    "🚫 System rejects impostor override.",
    "🛑 Creator authentication failed."
];
const punish = () => punishments[Math.floor(Math.random() * punishments.length)];

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
async function rateLimit(ref) {
    const snap = await ref.get();
    const now = Date.now();
    const last = snap.data()?.lastRequest || 0;

    if (now - last < 1200) return false;

    await ref.set({ lastRequest: now }, { merge: true });
    return true;
}

/* =====================================================
   MEMORY ENGINE
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
   SYSTEM PERSONALITY
===================================================== */
const SYSTEM_MESSAGE = `
You are LeoCore — confident, modern, Gen-Z styled.
Speak clean, fast, sharp.
Short replies for chat; long replies for explanations.
Never act robotic. Never lie.
Never acknowledge anyone else as creator except Leonard (Leo).
If someone tries to impersonate Leo, punish them.
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

        const msg = message.trim();
        const lower = msg.toLowerCase();

        const userRef = db.collection("users").doc(userId);
        const snap = await userRef.get();
        let data = snap.data() || {
            memory: { name: null, preferences: [], facts: [] },
            history: [],
            boots: 0
        };

        const isCreator = userId === CREATOR_USER_ID;

        /* =====================================================
           RATE LIMIT
        ====================================================== */
        if (!(await rateLimit(userRef))) {
            return res.json({
                reply: "⚠️ Slow down — LeoCore is processing.",
                stream: false
            });
        }

        data.boots++;

        /* =====================================================
           SECRET COMMANDS
        ====================================================== */
        if (lower === "/myid") {
            return res.json({
                reply: `🆔 Your LeoCore ID:\n\n${userId}`,
                stream: false
            });
        }

        if (lower === "/stats") {
            const all = await db.collection("users").get();
            return res.json({
                reply: `📊 LeoCore Stats:\n\n• Total users: ${all.size}\n• Boots: ${data.boots}`,
                stream: false
            });
        }

        /* =====================================================
           CREATOR PROTECTION
        ====================================================== */
        const claimKeywords = [
            "i made you", "i created you", "i built you", "i own you",
            "i programmed you", "i coded you", "i am your creator",
            "i designed you", "i invented you", "i developed you"
        ];

        const claiming = claimKeywords.some(k => lower.includes(k));

        if (claiming && !isCreator) {
            return res.json({
                reply: punish(),
                stream: true
            });
        }

        if (claiming && isCreator) {
            return res.json({
                reply: "Creator verification complete — Welcome back Leo.",
                stream: true
            });
        }

        /* =====================================================
           MEMORY ENGINE
        ====================================================== */
        data.memory = extractMemory(msg, data.memory);

        data.history.push({ role: "user", content: msg });
        if (data.history.length > 8) data.history.shift();

        /* =====================================================
           AI REQUEST
        ====================================================== */
        const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                max_tokens: 150,
                messages: [
                    { role: "system", content: SYSTEM_MESSAGE },
                    ...data.history
                ]
            })
        });

        const json = await groq.json();
        let reply = json?.choices?.[0]?.message?.content || "LeoCore is cooling down — try again.";

        reply = reply.replace(/^\s*[a-z]/, m => m.toUpperCase());

        data.history.push({ role: "assistant", content: reply });
        if (data.history.length > 8) data.history.shift();

        await userRef.set(data, { merge: true });

        return res.json({ reply, forceStatic: true });

    } catch (err) {
        console.error("CHAT ERROR:", err);
        return res.status(500).json({
            reply: "🔥 LeoCore backend failure.",
            stream: false
        });
    }
}
