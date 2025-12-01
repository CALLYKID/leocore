// =====================================================
// LEOCORE — STABLE GROQ CHAT ENGINE (NON-STREAM MODE)
// =====================================================

global.history = global.history || [];
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
        if (pref && !global.longTerm.preferences.includes(pref))
            global.longTerm.preferences.push(pref);
    }

    if (
        lower.includes("i live in") ||
        lower.includes("i am from") ||
        lower.includes("my birthday") ||
        lower.includes("i study") ||
        lower.includes("i want to become")
    ) {
        if (!global.longTerm.facts.includes(msg))
            global.longTerm.facts.push(msg);
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
// MAIN — NORMAL JSON RESPONSE (NO STREAMING)
// =====================================================
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ reply: "POST only." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const message = body?.message?.trim();

        if (!message) {
            return res.status(400).json({ reply: "Say something." });
        }

        extractMemory(message);

        global.history.push({ role: "user", content: message });
        if (global.history.length > 10) global.history.shift();

        const payload = {
            model: "llama-3.1-8b-instant",
            max_tokens: 400,
            temperature: 0.7,
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

        const data = await groqRes.json();

        const reply = data?.choices?.[0]?.message?.content || "Groq gave no reply.";

        global.history.push({ role: "assistant", content: reply });
        if (global.history.length > 10) global.history.shift();

        return res.status(200).json({ reply });

    } catch (err) {
        console.log("SERVER ERROR:", err);
        return res.status(200).json({
            reply: "Server error — try again."
        });
    }
}
