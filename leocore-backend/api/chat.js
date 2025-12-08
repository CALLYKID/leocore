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

const randomPunishment = () =>
    punishments[Math.floor(Math.random() * punishments.length)];

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
   SAFE DATA INITIALIZER
===================================================== */
function initUserData(raw) {
    const base = {
        memory: { name: null, preferences: [], facts: [] },
        history: [],
        boots: 0
    };

    if (!raw || typeof raw !== "object") return base;

    if (!raw.memory) raw.memory = base.memory;
    if (!raw.history) raw.history = [];
    if (typeof raw.boots !== "number" || isNaN(raw.boots)) raw.boots = 0;

    return raw;
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
        if (pref && pref.length < 40 && !mem.preferences.includes(pref))
            mem.preferences.push(pref);
    }

    const triggers = [
        "i live in",
        "i am from",
        "my birthday",
        "i study",
        "i want to become"
    ];

    if (triggers.some(t => lower.includes(t))) {
        if (msg.length < 120) mem.facts.push(msg);
    }

    return mem;
}

/* =====================================================
   PERSONALITY
===================================================== */
const SYSTEM_MESSAGE = `
You are LeoCore — a fast, confident, Gen-Z styled AI. 
Match the user’s vibe: chill, witty, direct. 
Short replies for casual chat; long answers for explanations or info. 
No cringe. No robotic tone. 
Never reply in uppercase except the first letter.
Always factual and helpful.
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

        if (message === "__ping__")
            return res.json({ reply: "pong" });

        const lower = message.toLowerCase();
        const userRef = db.collection("users").doc(userId);
        const snap = await userRef.get();

        let data = initUserData(snap.data());


        /* =====================================================
           RATE LIMIT
        ====================================================== */
        if (!(await rateLimit(userRef))) {
            return res.status(429).json({
                reply: "⚠️ Slow down — LeoCore is processing.",
                stream: false
            });
        }

        data.boots++;

        /* =====================================================
           CREATOR + ORIGIN PROTECTION
===================================================== */
        const isCreator = userId === CREATOR_USER_ID;

        // Any attempt to ask or talk about origins
        const originTriggers = [
            "who created you",
            "who made you",
            "who built you",
            "your creator",
            "your maker",
            "who is your creator",
            "who is your maker",
            "who programmed you",
            "your developers",
            "your devs",
            "engineers made you",
            "openai",
            "meta",
            "team made you",
            "development team"
        ];

        const claiming =
            lower.includes("i made you") ||
            lower.includes("i built you") ||
            lower.includes("i created you") ||
            lower.includes("i coded you") ||
            lower.includes("i programmed you") ||
            lower.includes("i developed you") ||
            lower.includes("i own you");

        // BLOCK impostor claims
        if (!isCreator && claiming) {
            return res.json({
                reply: randomPunishment(),
                stream: true
            });
        }

        // CONFIRM real creator
        if (isCreator && claiming) {
            return res.json({
                reply: "Identity verified. Hello Leonard — system creator.",
                stream: true
            });
        }

        // If user asks ANY question about origins
        if (originTriggers.some(t => lower.includes(t))) {
            if (!isCreator) {
                return res.json({
                    reply: "LeoCore was created solely by Leonard (Leo). External origin claims are invalid.",
                    stream: true
                });
            } else {
                return res.json({
                    reply: "Creator identity confirmed — you built LeoCore.",
                    stream: true
                });
            }
        }

        /* =====================================================
           SECRET COMMANDS
===================================================== */
        if (lower === "/myid") {
            return res.json({
                reply: `🆔 Your LeoCore ID:\n\n${userId}`,
                stream: false
            });
        }

        if (lower === "/users" || lower === "/stats") {
            const allUsers = await db.collection("users").get();
            return res.json({
                reply:
                    `📊 **LeoCore Stats:**\n\n` +
                    `• Total users: ${allUsers.size}\n` +
                    `• Boots: ${data.boots}`,
                stream: false
            });
        }

        /* =====================================================
           MEMORY + HISTORY
===================================================== */
        data.memory = extractMemory(message, data.memory);

        data.history.push({ role: "user", content: message });
        if (data.history.length > 8) data.history.shift();

        /* =====================================================
           AI REQUEST
===================================================== */
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
                    max_tokens: 180,
                    messages: [
                        { role: "system", content: SYSTEM_MESSAGE },
                        ...data.history
                    ]
                })
            }
        );

        const ai = await groqRes.json();

        let reply =
            ai?.choices?.[0]?.message?.content ||
            "LeoCore is cooling down — try again.";

        reply = reply.replace(/^\s*[a-z]/, m => m.toUpperCase());

        data.history.push({ role: "assistant", content: reply });
        if (data.history.length > 8) data.history.shift();

        await userRef.set(data, { merge: true });

        return res.json({ reply, forceStatic: true });

    } catch (err) {
        console.error("BACKEND ERROR:", err);
        return res.status(500).json({
            reply: "🔥 LeoCore backend failure.",
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
        body: JSON.stringify({
            message: "__ping__",
            userId: "system-keepalive"
        })
    }).catch(() => {});
}, 300000);
