// =====================================================
// LEOCORE — ADVANCED MEMORY + SMART RETRY CHAT ENGINE
// =====================================================

// Short-term conversation memory (last 10 messages)
global.history = global.history || [];

// Long-term memory (persists across requests)
global.longTerm = global.longTerm || {
    name: null,
    preferences: [],
    facts: []
};

// =====================================================
// MEMORY EXTRACTOR (detects and stores info)
// =====================================================
function extractMemory(message) {
    const lower = message.toLowerCase();

    if (lower.includes("my name is")) {
        const name = message.split(/my name is/i)[1]
            .trim()
            .split(" ")[0]
            .replace(/[^a-z]/gi, "");
        if (name) global.longTerm.name = name;
    }

    if (lower.startsWith("i like") || lower.startsWith("i love")) {
        const pref = message.replace(/i like|i love/i, "").trim();
        if (pref.length > 2 && !global.longTerm.preferences.includes(pref)) {
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
        if (!global.longTerm.facts.includes(message)) {
            global.longTerm.facts.push(message);
        }
    }

    if (lower.startsWith("forget everything")) {
        global.longTerm = { name: null, preferences: [], facts: [] };
    }
}

// =====================================================
// FORMAT MEMORY FOR MODEL
// =====================================================
function memoryBlock() {
    return `
User name: ${global.longTerm.name || "unknown"}
Likes: ${global.longTerm.preferences.join(", ") || "none"}
Facts: ${global.longTerm.facts.join(" | ") || "none"}
`;
}

// =====================================================
// SAFE FETCH — retries if Groq returns empty response
// =====================================================
async function groqRequest(payload) {
    const url = "https://api.groq.com/openai/v1/chat/completions";

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            // VALID RESPONSE?
            if (data?.choices?.[0]?.message?.content) {
                return data.choices[0].message.content;
            }

            // If empty → retry with safer model
            payload.model = "llama-3.3-70b-specdec";

        } catch (e) {
            // Try again
        }
    }

    return "My brain is tired 😭 try again in a moment.";
}

// =====================================================
// MAIN HANDLER
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

        // Update memory
        extractMemory(message);

        // Add to history
        global.history.push({ role: "user", content: message });
        if (global.history.length > 10) global.history.shift();

        // Build payload
        const payload = {
            model: "llama-3.1-70b-versatile",
            max_tokens: 400,
            temperature: 0.7,
            messages: [
                {
                    role: "system",
                    content: "You are Leocore, a fast, modern AI assistant. Speak clean, helpful, confident."
                },
                {
                    role: "system",
                    content: "User memory:\n" + memoryBlock()
                },
                ...global.history
            ]
        };

        // Send request (with auto-retry)
        const reply = await groqRequest(payload);

        // Store AI reply in history
        global.history.push({ role: "assistant", content: reply });
        if (global.history.length > 10) global.history.shift();

        return res.status(200).json({ reply });

    } catch (err) {
        return res.status(200).json({
            reply: "Server is cooling down 🔥 try again."
        });
    }
}
