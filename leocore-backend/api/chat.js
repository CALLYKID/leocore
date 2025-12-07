import admin from "firebase-admin";
import fetch from "node-fetch";

/* =====================================================
   CONFIG
===================================================== */

// ⭐ YOUR REAL CREATOR USER ID ⭐
const CREATOR_USER_ID = "user-qgepdglujfq";

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
        if (pref && pref.length < 40 && !mem.preferences.includes(pref))
            mem.preferences.push(pref);
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
Give short replies for casual chat, but detailed answers for info, explanations, lists, or code.
Never shorten important responses.
Use emojis naturally, not spammy.
Never stream system/boot messages.
Tone: modern, smart, helpful, slightly playful.
Never reply with full uppercase except the first letter.
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

        // KEEP ALIVE
        if (message === "__ping__") return res.json({ reply: "pong" });

        const lower = message.toLowerCase();
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
            return res.status(429).json({
                reply: "⚠️ Slow down — LeoCore is processing.",
                stream: false
            });
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
           SECRET COMMAND (CREATOR ONLY): /stats
        ====================================================== */
        if (lower.trim() === "/stats") {
            if (!isCreator) {
                return res.json({ reply: randomPunishment(), stream: false });
            }

            const usersSnap = await db.collection("users").get();
            let totalUsers = usersSnap.size;

            let totalMemories = 0;
            let totalMessages = 0;

            usersSnap.forEach(doc => {
                const u = doc.data();
                if (u.memory) {
                    totalMemories +=
                        (u.memory.name ? 1 : 0) +
                        (u.memory.preferences?.length || 0) +
                        (u.memory.facts?.length || 0);
                }
                if (u.history) totalMessages += u.history.length;
            });

            return res.json({
                reply:
`📊 **LeoCore System Stats**
━━━━━━━━━━━━━━━━
👤 Total Users: **${totalUsers}**
🧠 Stored Memories: **${totalMemories}**
💬 Total Messages Recorded: **${totalMessages}**
🔐 Creator: **Leonard (Leo)**  
━━━━━━━━━━━━━━━━
(Real-time analytics powered by Firebase)`,
                stream: false
            });
        }


        /* =====================================================
           CREATOR CLAIMING LOGIC
        ====================================================== */
        const claiming =
            lower.includes("i made you") ||
            lower.includes("i built you") ||
            lower.includes("i created you");

        if (!isCreator && claiming) {
            return res.json({ reply: randomPunishment(), stream: true });
        }

        if (isCreator && claiming) {
            return res.json({
                reply: "Identity confirmed: Leonard (Leo), system creator.",
                stream: true
            });
        }


        /* =====================================================
           MEMORY SAVE
        ====================================================== */
        data.memory = extractMemory(message, data.memory);

        data.history.push({ role: "user", content: message });
        if (data.history.length > 8) data.history.shift();


        /* =====================================================
           SEND TO GROQ
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

        // force first letter uppercase
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
   KEEP BACKEND ALIVE (5 min)
===================================================== */
setInterval(() => {
    fetch("https://leocore.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "__ping__", userId: "system-keepalive" })
    }).catch(() => {});
}, 300000);
