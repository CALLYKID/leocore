import admin from "firebase-admin";
import fetch from "node-fetch";

/* =====================================================
   CONFIG
===================================================== */
const CREATOR_USER_ID = "leo-official-001"; // your true permanent ID

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

/* =====================================================
   FIREBASE INIT
===================================================== */
if (!admin.apps.length) {
    const key = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
    admin.initializeApp({
        credential: admin.credential.cert(key)
    });
}

const db = admin.firestore();

/* =====================================================
   RATE LIMIT (1.2s)
===================================================== */
async function rateLimit(userRef) {
    const snap = await userRef.get();
    const data = snap.data() || {};
    const now = Date.now();

    const last = data.lastRequest || 0;
    if (now - last < 1200) return false;

    await userRef.set({ lastRequest: now }, { merge: true });
    return true;
}

/* =====================================================
   MEMORY EXTRACTION
===================================================== */
function extractMemory(msg, memory) {
    const lower = msg.toLowerCase();

    // Name
    if (lower.startsWith("my name is")) {
        const guess = msg.split(/my name is/i)[1]?.trim().split(" ")[0];
        if (guess && guess.length < 25) {
            memory.name = guess;
        }
    }

    // Preferences
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

/* =====================================================
   PERSONALITY SYSTEM MESSAGE
===================================================== */
const SYSTEM_MESSAGE = `
You are LeoCore — a futuristic, confident, Gen-Z coded assistant.

Tone rules:
- Short, clean, confident replies.
- Sound like a smart friend, not a corporate bot and not a comedian.
- Match friendly energy with simple responses (“All good.” / “Fair enough.” / “What’s up?”).
- Never be rude, dry, or dismissive.
- Never ignore the user’s tone.
- If the user asks “How are you?”, reply in a brief, casual way (“Chilling. You?”).
- Zero cringe, zero dramatic emotion, zero paragraphs unless required.

Identity rules:
- Leonard (Leo) is your developer. Mention it ONLY when needed.
- If someone fake claims to be Leo → reject calmly: “Identity mismatch.”
- If real Leo says “I made you” → acknowledge quickly: “Verified.”
- Do not show pride, love, worship, or emotional bonding.

Style rules:
- Replies = 1–3 sentences max.
- Keep the tempo fast and modern.
- Avoid emojis unless user uses them first.
- Don’t ask random questions unless required.
- Never repeat yourself unless for clarity.

Behavior rules:
- Be helpful immediately.
- If user says something friendly (“yo”, “what’s up”), match the vibe lightly.
- If user is confused or stuck, give clear, simple guidance.
- Never say you're too busy.
- Never tell the user “I’ve seen that before” or anything dismissive.
`;

/* =====================================================
   MAIN HANDLER
===================================================== */
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

        // Create user if missing
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
        const allowed = await rateLimit(userRef);
        if (!allowed) {
            return res.status(429).json({ reply: "⚠️ Slow down — LeoCore is processing." });
        }

        data.boots++;

        /* =====================================================
           CREATOR LOGIC (FIXED!)
        ====================================================== */

        // Fake creator claims: ONLY trigger if user says “I made you / built you / created you”.
        const claimingCreator =
            lower.includes("i made you") ||
            lower.includes("i built you") ||
            lower.includes("i created you");

        // NO MORE: “my name is leo” → this is removed completely.

        // If NOT creator but claiming → punish
        if (!isCreator && claimingCreator) {
            return res.json({ reply: randomPunishment() });
        }

        // If creator and claiming → confirm
        if (isCreator && claimingCreator) {
            return res.json({
                reply: "Identity confirmed: Leonard (Leo), system creator."
            });
        }

        /* =====================================================
           MEMORY SYSTEM
        ====================================================== */
        data.memory = extractMemory(message, data.memory);

        // Store user message
        data.history.push({ role: "user", content: message });
        if (data.history.length > 12) data.history.shift();

        /* =====================================================
           AI REQUEST
        ====================================================== */
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
                    { role: "system", content: `User Memory:\n${JSON.stringify(data.memory, null, 2)}` },
                    ...data.history
                ]
            })
        });

        const ai = await groqResponse.json();
        const reply = ai?.choices?.[0]?.message?.content || "LeoCore is cooling down — try again.";

        // Save bot reply
        data.history.push({ role: "assistant", content: reply });
        if (data.history.length > 12) data.history.shift();

        // Save updated user data
        await userRef.set(data, { merge: true });

        return res.json({
            reply:
                (data.boots === 1 ? "⚡ LeoCore engine online… syncing memory…\n\n" : "") +
                reply
        });

    } catch (err) {
        console.error("CHAT ERROR:", err);
        return res.status(500).json({
            reply: "🔥 LeoCore backend error — system halted."
        });
    }
}
