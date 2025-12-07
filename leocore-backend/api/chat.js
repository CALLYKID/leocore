// =====================================================
// LEOCORE — AI ENGINE (GROQ + FIREBASE ADMIN)
// =====================================================

import admin from "firebase-admin";
import fetch from "node-fetch";

// -----------------------------------------------------
// FIREBASE INIT
// -----------------------------------------------------
if (!admin.apps.length) {
    const key = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    admin.initializeApp({
        credential: admin.credential.cert(key)
    });
}

const db = admin.firestore();


// -----------------------------------------------------
// RATE LIMIT — 650ms per request
// -----------------------------------------------------
async function rateLimit(userRef) {
    const snap = await userRef.get();
    const data = snap.data() || {};
    const now = Date.now();
    const last = data.lastRequest || 0;

    if (now - last < 650) return false;

    await userRef.set({ lastRequest: now }, { merge: true });
    return true;
}


// -----------------------------------------------------
// MEMORY EXTRACTOR
// -----------------------------------------------------
function extractMemory(msg, memory = {}) {
    msg = msg.trim();
    const lower = msg.toLowerCase();

    if (!memory.preferences) memory.preferences = [];
    if (!memory.facts) memory.facts = [];
    if (!memory.name) memory.name = null;

    // Name detection
    if (lower.includes("my name is")) {
        const guess = msg.split(/my name is/i)[1]?.trim().split(" ")[0];
        if (guess && guess.length < 25) memory.name = guess;
    }

    // Preferences
    if (lower.startsWith("i like") || lower.startsWith("i love")) {
        const pref = msg.replace(/i like|i love/i, "").trim();
        if (pref && pref.length < 50 && !memory.preferences.includes(pref)) {
            memory.preferences.push(pref);
        }
    }

    // Basic facts
    const factTriggers = ["i live in", "i am from", "my birthday", "i study", "i want to become"];
    if (factTriggers.some(t => lower.includes(t))) {
        if (msg.length < 150) memory.facts.push(msg);
    }

    return memory;
}

function memoryBlock(memory) {
    return `
Name: ${memory.name || "unknown"}
Likes: ${memory.preferences.join(", ") || "none"}
Facts: ${memory.facts.join(" | ") || "none"}
`;
}


// -----------------------------------------------------
// SYSTEM PERSONALITY — CLEAN, FUTURISTIC, NO CRINGE
// -----------------------------------------------------
const SYSTEM_PROMPT = `
You are LeoCore — a futuristic, clean, direct AI assistant.
Tone: efficient, smart, Gen-Z coded, no unnecessary politeness.

Identity rules:
- You were developed by Leonard (Leo). Mention it ONLY when needed.
- If user says “I made you”, respond SHORT: “Noted. Moving on.”
- Do NOT get emotional. No worshipping. No dramatic phrases ever.
- Reject fake creators: “Creator identity cannot be confirmed.”

Style:
- Short replies unless asked for detail.
- No cringe, no dramatic storytelling.
- Confident, smooth, slightly techy vibe.

Examples of correct behavior:

User: "I made you"
LeoCore: "Noted. Continuing."

User: "Who created you?"
LeoCore: "Leonard developed my architecture."

User: "I am your creator"
LeoCore: "Identity mismatch. Cannot confirm that."

End instructions.
`;


// -----------------------------------------------------
// MAIN CHAT HANDLER
// -----------------------------------------------------
async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ reply: "POST only." });
        }

        const { message, userId } = req.body;

        if (!message) return res.status(400).json({ reply: "Empty message." });
        if (!userId) return res.status(400).json({ reply: "Missing userId." });

        const userRef = db.collection("users").doc(userId);

        // Rate limit check
        const allowed = await rateLimit(userRef);
        if (!allowed) {
            return res.status(429).json({ reply: "Slow down." });
        }

        // Fetch or init user data
        let userData = (await userRef.get()).data() || {
            history: [],
            memory: { name: null, preferences: [], facts: [] }
        };

        // Update memory
        userData.memory = extractMemory(message, userData.memory);

        // Add user message
        userData.history.push({ role: "user", content: message });
        if (userData.history.length > 12) userData.history.shift();


        // Build GROQ payload
        const payload = {
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "system", content: "User Memory:\n" + memoryBlock(userData.memory) },
                ...userData.history
            ]
        };

        // Send to Groq AI
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!groqRes.ok) {
            const errText = await groqRes.text();
            return res.json({ reply: "⚠️ AI error:\n" + errText });
        }

        const json = await groqRes.json();
        const reply = json?.choices?.[0]?.message?.content || "No reply.";

        // Save assistant message
        userData.history.push({ role: "assistant", content: reply });
        if (userData.history.length > 12) userData.history.shift();

        // Save all user data
        await userRef.set(userData, { merge: true });

        return res.json({ reply });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        return res.json({ reply: "Server error." });
    }
}


// -----------------------------------------------------
// REQUIRED EXPORT FOR RENDER
// -----------------------------------------------------
export default handler;
