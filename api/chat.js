// =====================================================
// LEOCORE — PRODUCTION AI ENGINE (FIRESTORE + GROQ)
// =====================================================

import admin from "firebase-admin";

// Enable Node fetch explicitly
import fetch from "node-fetch";

// Prevent double-initialisation
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(
            JSON.parse(process.env.FIREBASE_ADMIN_KEY)
        )
    });
}

const db = admin.firestore();

// =====================================================
// RATE LIMIT — 1 request per user every 800ms
// =====================================================
async function rateLimit(userRef) {
    const snap = await userRef.get();
    const data = snap.data() || {};

    const now = Date.now();
    const last = data.lastRequest || 0;

    if (now - last < 800) return false;

    await userRef.set({ lastRequest: now }, { merge: true });
    return true;
}

// =====================================================
// MEMORY EXTRACTOR
// =====================================================
function extractMemory(msg, memory) {
    msg = msg.trim();
    const lower = msg.toLowerCase();

    if (!memory.preferences) memory.preferences = [];
    if (!memory.facts) memory.facts = [];

    if (lower.includes("my name is")) {
        memory.name = msg.split(/my name is/i)[1]?.trim().split(" ")[0] || null;
    }

    if (lower.startsWith("i like") || lower.startsWith("i love")) {
        const pref = msg.replace(/i like|i love/i, "").trim();
        if (pref && !memory.preferences.includes(pref)) {
            memory.preferences.push(pref);
        }
    }

    if (
        lower.includes("i live in") ||
        lower.includes("i am from") ||
        lower.includes("my birthday") ||
        lower.includes("i study") ||
        lower.includes("i want to become")
    ) {
        memory.facts.push(msg);
    }

    return memory;
}

// =====================================================
// MEMORY BLOCK SENT TO AI
// =====================================================
function memoryBlock(memory) {
    return `
User: ${memory.name || "unknown"}
Likes: ${memory.preferences.join(", ") || "none"}
Facts: ${memory.facts.join(" | ") || "none"}
`;
}

// =====================================================
// MAIN HANDLER
// =====================================================
export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ reply: "POST only." });
        }

        const body =
            typeof req.body === "string" ? JSON.parse(req.body) : req.body;

        if (!body?.message) {
            return res.status(400).json({ reply: "Empty message." });
        }

        if (!body?.userId) {
            return res.status(400).json({ reply: "Missing userId." });
        }

        const message = body.message.trim();
        const userRef = db.collection("users").doc(body.userId);

        // Rate limit
        const allowed = await rateLimit(userRef);
        if (!allowed) {
            return res.status(429).json({ reply: "Slow down bruv 💀" });
        }

        // Load data
        let userData =
            (await userRef.get()).data() || {
                history: [],
                memory: { name: null, preferences: [], facts: [] }
            };

        // Update memory
        userData.memory = extractMemory(message, userData.memory);

        // Update history
        userData.history.push({ role: "user", content: message });
        if (userData.history.length > 12) userData.history.shift();

        // GROQ payload
        const payload = {
            model: "llama-3.1-8b-instant",
            stream: true,
            messages: [
                {
                    role: "system",
                    content: `
You are Leocore — a chill, Gen Z–styled AI created for Leo.
Keep messages natural and spaced nicely.
Avoid glitchy punctuation or broken words.
`
                },
                {
                    role: "system",
                    content: "User memory:\n" + memoryBlock(userData.memory)
                },
                ...userData.history
            ]
        };

        // =====================================================
        // STREAMING HEADERS
        // =====================================================
        res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no" // Disable buffering on some proxies
        });

        // =====================================================
        // GROQ REQUEST
        // =====================================================
        const groqRes = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify(payload)
            }
        );

        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();

        let finalText = "";

        // =====================================================
        // STREAMING LOOP
        // =====================================================
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (let line of lines) {
                if (!line.startsWith("data:")) continue;

                const json = line.replace("data:", "").trim();

                if (json === "[DONE]") {
                    res.write("data: END\n\n");
                    res.flush?.();
                    break;
                }

                try {
                    const obj = JSON.parse(json);
                    const token =
                        obj?.choices?.[0]?.delta?.content || "";

                    if (token) {
                        finalText += token;
                        res.write(`data: ${token}\n\n`);
                        res.flush?.();
                    }
                } catch {
                    // ignore malformed chunks
                }
            }
        }

        // Save assistant reply
        userData.history.push({
            role: "assistant",
            content: finalText
        });

        if (userData.history.length > 12) userData.history.shift();

        await userRef.set(userData, { merge: true });

        res.end();
    } catch (err) {
        console.error("SERVER ERROR:", err);
        res.end();
    }
}
