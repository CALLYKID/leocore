// =====================================================
// LEOCORE — ADVANCED CHATGPT-STYLE MEMORY ENGINE
// =====================================================

// 🔥 Conversation memory (short-term)
global.history = global.history || [];  // stores last 10 messages

// 🔥 Long-term memory (like ChatGPT "Memory")
global.longTerm = global.longTerm || {
    name: null,
    preferences: [],
    facts: []
};

// =====================================================
// 🧠 MEMORY EXTRACTOR — detects useful info automatically
// =====================================================
function extractMemory(message) {
    const lower = message.toLowerCase();

    // NAME
    if (lower.includes("my name is")) {
        const name = message.split(/my name is/i)[1]
            .trim()
            .split(" ")[0]
            .replace(/[^a-z]/gi, "");

        if (name.length > 1) global.longTerm.name = name;
    }

    // PREFERENCES
    if (lower.startsWith("i like") || lower.startsWith("i love")) {
        const pref = message.replace(/i like|i love/i, "").trim();
        if (pref.length > 2 && !global.longTerm.preferences.includes(pref)) {
            global.longTerm.preferences.push(pref);
        }
    }

    // FACTS  
    if (
        lower.includes("i live in") ||
        lower.includes("i am from") ||
        lower.includes("my birthday") ||
        lower.includes("i study") ||
        lower.includes("i want to become")
    ) {
        if (!global.longTerm.facts.includes(message)) {
            global.longTerm.facts.push(message);
        }
    }

    // FORGET COMMAND
    if (lower.startsWith("forget everything")) {
        global.longTerm = { name: null, preferences: [], facts: [] };
    }
}

// =====================================================
// FORMAT MEMORY FOR MODEL
// =====================================================
function buildMemoryPrompt() {
    return `
User name: ${global.longTerm.name || "unknown"}
Preferences: ${global.longTerm.preferences.join(", ") || "none"}
Facts: ${global.longTerm.facts.join(" | ") || "none"}
`;
}

// =====================================================
// MAIN HANDLER (ESM VERSION FOR VERCEL)
// =====================================================
export default async function handler(req, res) {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
        return res.status(200).json({ reply: "POST only." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const message = body?.message?.trim();

        if (!message) {
            return res.status(200).json({ reply: "Say something." });
        }

        // 🧠 1) Extract memory
        extractMemory(message);

        // 💬 2) Add user message to history
        global.history.push({ role: "user", content: message });
        if (global.history.length > 10) global.history.shift();

        // 📦 3) Build payload
        const payload = {
            model: "llama-3.1-70b-versatile",
            max_tokens: 400,
            temperature: 0.6,
            messages: [
                {
                    role: "system",
                    content:
                        "You are Leocore, a fast, smart assistant. " +
                        "Use memory naturally, not creepily. Speak clean."
                },
                {
                    role: "system",
                    content: "Long-term memory:\n" + buildMemoryPrompt()
                },
                ...global.history
            ]
        };

        // ⚡ 4) Send to Groq
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const data = await groqRes.json();
        const reply =
            data?.choices?.[0]?.message?.content ||
            "I lagged — say that again?";

        // 🧠 5) Add AI reply to history
        global.history.push({ role: "assistant", content: reply });
        if (global.history.length > 10) global.history.shift();

        return res.status(200).json({ reply });

    } catch (err) {
        return res.status(200).json({ reply: "Server busy — try again." });
    }
}
