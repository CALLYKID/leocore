// =====================================================
// LEOCORE — STREAMING GROQ ENGINE (LATEST MODEL)
// =====================================================

// Short-term memory
global.history = global.history || [];

// Long-term memory
global.longTerm = global.longTerm || {
    name: null,
    preferences: [],
    facts: []
};

// Extract memory
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

function memoryBlock() {
    return `
User: ${global.longTerm.name || "unknown"}
Likes: ${global.longTerm.preferences.join(", ") || "none"}
Facts: ${global.longTerm.facts.join(" | ") || "none"}
`;
}

// =====================================================
// STREAMING HANDLER
// =====================================================
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ reply: "POST only." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const message = body?.message?.trim();
        if (!message) return res.status(400).json({ reply: "Empty message." });

        extractMemory(message);

        global.history.push({ role: "user", content: message });
        if (global.history.length > 10) global.history.shift();

        // STREAM SETUP
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Connection", "keep-alive");

        const payload = {
            model: "llama-3.1-8b-instant",
            stream: true,
            messages: [
                { role: "system", content: "You are Leocore, a modern, confident AI." },
                { role: "system", content: "Memory:\n" + memoryBlock() },
                ...global.history
            ]
        };

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!groqRes.body) {
            res.write(`data: error\n\n`);
            res.end();
            return;
        }

        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();

        // STREAM TOKENS
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (let line of lines) {
                line = line.trim();
                if (!line.startsWith("data:")) continue;

                const jsonStr = line.replace("data:", "").trim();
                if (jsonStr === "[DONE]") {
                    res.write("event: end\ndata: END\n\n");
                    res.end();
                    return;
                }

                try {
                    const data = JSON.parse(jsonStr);
                    const token = data?.choices?.[0]?.delta?.content;
                    if (token) {
                        res.write(`data: ${token}\n\n`);
                    }
                } catch {
                    continue;
                }
            }
        }

        res.end();
    } catch (err) {
        console.log("❌ SERVER ERROR:", err);
        res.end();
    }
}
