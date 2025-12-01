// =====================================================
// LEOCORE — STABLE GROQ CHAT ENGINE (NO MORE EMPTY BUGS)
// =====================================================

// Short-term memory (keeps last 10 messages)
global.history = global.history || [];

// Long-term memory (persists on server)
global.longTerm = global.longTerm || {
    name: null,
    preferences: [],
    facts: []
};

// =====================================================
// MEMORY EXTRACTION
// =====================================================
function extractMemory(msg) {
    const lower = msg.toLowerCase();

    if (lower.includes("my name is")) {
        const name = msg.split(/my name is/i)[1]
            .trim()
            .split(" ")[0]
            .replace(/[^a-z]/gi, "");
        if (name) global.longTerm.name = name;
    }

    if (lower.startsWith("i like") || lower.startsWith("i love")) {
        const pref = msg.replace(/i like|i love/i, "").trim();
        if (pref && !global.longTerm.preferences.includes(pref)) {
            global.longTerm.preferences.push(pref);
        }
    }

    if (
        lower.includes("i live in") ||
        lower.includes("i am from") ||
        lower.includes("my birthday") ||
        lower.includes("i study") ||
        lower.includes("i want to become")
    ) {
        if (!global.longTerm.facts.includes(msg)) {
            global.longTerm.facts.push(msg);
        }
    }
}

// Format memory block
function memoryBlock() {
    return `
User: ${global.longTerm.name || "unknown"}
Likes: ${global.longTerm.preferences.join(", ") || "none"}
Facts: ${global.longTerm.facts.join(" | ") || "none"}
`;
}

// =====================================================
// MAIN HANDLER
// =====================================================
export default async function handler(req, res) {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
        console.log("❌ NON-POST request:", req.method);
        return res.status(405).json({ reply: "POST only." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const message = body?.message?.trim();

        if (!message) {
            console.log("❌ No message sent");
            return res.status(200).json({ reply: "Say something." });
        }

        extractMemory(message);

        // Add user message to history
        global.history.push({ role: "user", content: message });
        if (global.history.length > 10) global.history.shift();

        // Build payload
        const payload = {
            model: "llama3-8b-8192",       // ✅ STABLE MODEL
            max_tokens: 400,
            temperature: 0.7,
            messages: [
                {
                    role: "system",
                    content:
                        "You are Leocore, a modern, confident AI companion. Keep responses clean and clear."
                },
                {
                    role: "system",
                    content: "Memory:\n" + memoryBlock()
                },
                ...global.history
            ]
        };

        console.log("🔥 Sending request to Groq...");
        console.log("🔑 API key exists?", !!process.env.GROQ_API_KEY);

        // Make request
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const raw = await groqRes.text();
        console.log("📥 RAW GROQ RESPONSE:", raw);

        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.log("❌ JSON PARSE ERROR:", e);
            return res.status(200).json({
                reply: "Groq sent invalid JSON. Try again soon."
            });
        }

        const reply = data?.choices?.[0]?.message?.content;

        if (!reply) {
            console.log("❌ Empty Groq reply");
            return res.status(200).json({
                reply: "Groq gave an empty response. Check logs."
            });
        }

        global.history.push({ role: "assistant", content: reply });
        if (global.history.length > 10) global.history.shift();

        return res.status(200).json({ reply });

    } catch (err) {
        console.log("❌ SERVER CRASH:", err);
        return res.status(200).json({
            reply: "Server error — check logs!"
        });
    }
}
