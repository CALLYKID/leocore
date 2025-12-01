// =====================================================
// LEOCORE — PRODUCTION AI ENGINE (FIRESTORE + GROQ)
// =====================================================

// 1) FIREBASE ADMIN INIT
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY)),
    });
}

const db = admin.firestore();

// 2) Rate limit: 1 request per user every 800ms
async function rateLimit(userRef) {
    const snap = await userRef.get();
    const data = snap.data() || {};

    const now = Date.now();
    const last = data.lastRequest || 0;

    if (now - last < 800) {
        return false;
    }

    await userRef.set({ lastRequest: now }, { merge: true });
    return true;
}

// 3) Safe memory extractor
function extractMemory(msg, memory) {
    const lower = msg.toLowerCase();

    if (lower.includes("my name is")) {
        memory.name = msg.split(/my name is/i)[1].trim().split(" ")[0];
    }

    if (lower.startsWith("i like") || lower.startsWith("i love")) {
        const pref = msg.replace(/i like|i love/i, "").trim();
        if (!memory.preferences.includes(pref)) {
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

// 4) Build memory block for AI
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

        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

        if (!body?.message) {
            return res.status(400).json({ reply: "Empty message." });
        }

        if (!body?.userId) {
            return res.status(400).json({ reply: "Missing userId." });
        }

        const message = body.message.trim();
        const userRef = db.collection("users").doc(body.userId);

        // Check rate limit
        const allowed = await rateLimit(userRef);
        if (!allowed) {
            return res.status(429).json({ reply: "Slow down bruv 💀" });
        }

        // Load user memory/history
        let userData = (await userRef.get()).data() || {
            history: [],
            memory: { name: null, preferences: [], facts: [] }
        };

        // Update long-term memory
        userData.memory = extractMemory(message, userData.memory);

        // Update chat history
        userData.history.push({ role: "user", content: message });
        if (userData.history.length > 12) userData.history.shift();

        // Prepare GROQ payload
        const payload = {
            model: "llama-3.1-8b-instant",
            stream: true,
            messages: [
                {
                    role: "system",
                    content: `
You are Leocore — a chill, Gen Z–styled AI created for Leo.
Keep messages natural, clean, spaced properly.
Never break words. Never glitch punctuation.
`
                },
                {
                    role: "system",
                    content: "User memory:\n" + memoryBlock(userData.memory)
                },
                ...userData.history
            ]
        };

        // Send headers for streaming
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");

        // Groq request
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();

        let finalText = "";

        // Streaming loop
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
                    break;
                }

                try {
                    const obj = JSON.parse(json);
                    const token = obj?.choices?.[0]?.delta?.content;

                    if (token) {
                        finalText += token;
                        res.write(`data: ${token}\n\n`);
                    }
                } catch {
                    /* ignore malformed packets */
                }
            }
        }

        // Save AI reply into history
        userData.history.push({ role: "assistant", content: finalText });
        if (userData.history.length > 12) userData.history.shift();

        // Save updated user data
        await userRef.set(userData, { merge: true });

        res.end();
    } catch (err) {
        console.error("SERVER ERROR:", err);
        return res.end();
    }
}
