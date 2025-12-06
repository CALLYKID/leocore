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
// RATE LIMIT
// -----------------------------------------------------
async function rateLimit(userRef) {
    const snap = await userRef.get();
    const data = snap.data() || {};
    const now = Date.now();
    const last = data.lastRequest || 0;

    if (now - last < 800) return false;

    await userRef.set({ lastRequest: now }, { merge: true });
    return true;
}

// -----------------------------------------------------
// MEMORY FUNCTIONS
// -----------------------------------------------------
function extractMemory(msg, memory = {}) {
    msg = msg.trim();
    const lower = msg.toLowerCase();

    if (!memory.preferences) memory.preferences = [];
    if (!memory.facts) memory.facts = [];
    if (!memory.name) memory.name = null;

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

function memoryBlock(memory) {
    return `
User: ${memory.name || "unknown"}
Likes: ${memory.preferences.join(", ") || "none"}
Facts: ${memory.facts.join(" | ") || "none"}
`;
}

// -----------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------
export default async function chatHandler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ reply: "POST only." });
        }

        const { message, userId } = req.body;

        if (!message) return res.status(400).json({ reply: "Empty message." });
        if (!userId) return res.status(400).json({ reply: "Missing userId." });

        const userRef = db.collection("users").doc(userId);

        // RATE LIMIT
        const allowed = await rateLimit(userRef);
        if (!allowed) return res.status(429).json({ reply: "Slow down fam 💀" });

        // LOAD DATA + SAFETY STRUCTURE
        let userData = (await userRef.get()).data() || {};
        if (!userData.history) userData.history = [];
        if (!userData.memory) userData.memory = { name: null, preferences: [], facts: [] };

        // UPDATE MEMORY + HISTORY
        userData.memory = extractMemory(message, userData.memory);

        userData.history.push({ role: "user", content: message });
        if (userData.history.length > 12) userData.history.shift();

        // PREPARE REQUEST
        const payload = {
            model: "llama-3.1-8b-instant",
            stream: true,
            messages: [
                {
                    role: "system",
                    content: `
You are Leocore — a chill, Gen Z AI made for Leo.
Keep replies natural and spaced clean.
`
                },
                { role: "system", content: "User memory:\n" + memoryBlock(userData.memory) },
                ...userData.history
            ]
        };

        // STREAM HEADERS
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        });

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

        if (!groqRes.ok) {
            const err = await groqRes.text();
            res.write(`data: ${"⚠️ AI error: " + err}\n\n`);
            return res.end();
        }

        let final = "";

        // =====================================================
        // ⭐ FIXED NODE STREAM LOOP — NO EARLY RETURN
        // =====================================================
        groqRes.body.on("data", (chunk) => {
            const text = chunk.toString();
            const lines = text.split("\n");

            for (const line of lines) {
                if (!line.startsWith("data:")) continue;

                const json = line.replace("data:", "").trim();

                if (json === "[DONE]") {
                    res.write("data: END\n\n");
                    continue; // <-- IMPORTANT FIX
                }

                try {
                    const obj = JSON.parse(json);
                    const token = obj?.choices?.[0]?.delta?.content || "";

                    if (token) {
                        final += token;
                        res.write(`data: ${token}\n\n`);
                    }
                } catch {
                    // Ignore malformed JSON chunks
                }
            }
        });

        groqRes.body.on("end", async () => {
            userData.history.push({ role: "assistant", content: final });
            if (userData.history.length > 12) userData.history.shift();

            await userRef.set(userData, { merge: true });

            res.end();
        });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        res.end();
    }
}
