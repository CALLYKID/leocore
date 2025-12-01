// =====================================================
// LEOCORE — DEBUG-ENABLED CHAT ENGINE (REAL ERRORS SHOWN)
// =====================================================

// Short-term memory (10 messages)
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
        if (!global.longTerm.preferences.includes(pref)) {
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
// MAIN HANDLER — NOW WITH FULL DEBUG LOGS
// =====================================================
export default async function handler(req, res) {
    res.setHeader("Content-Type", "application/json");

    // Only allow POST
    if (req.method !== "POST") {
        console.log("❌ Received NON-POST request:", req.method);
        return res.status(405).json({ reply: "POST only." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const message = body?.message?.trim();

        if (!message) {
            console.log("❌ No message provided");
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
            max_tokens: 300,
            temperature: 0.7,
            messages: [
                {
                    role: "system",
                    content: "You are Leocore, a fast, confident AI with modern tone."
                },
                {
                    role: "system",
                    content: "Memory:\n" + memoryBlock()
                },
                ...global.history
            ]
        };

        console.log("🔥 Sending to Groq...");
        console.log("🔑 API KEY exists?", !!process.env.GROQ_API_KEY);

        // Make request
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const rawText = await groqRes.text();
        console.log("📥 Raw Groq Response:", rawText);

        const data = JSON.parse(rawText);

        const reply = data?.choices?.[0]?.message?.content;
        if (!reply) {
            console.log("❌ Groq returned NO reply");
            return res.status(200).json({
                reply: "Groq gave an empty response. Check logs."
            });
        }

        // Add AI response
        global.history.push({ role: "assistant", content: reply });
        if (global.history.length > 10) global.history.shift();

        return res.status(200).json({ reply });

    } catch (error) {
        console.log("❌ SERVER CRASH:", error);
        return res.status(200).json({
            reply: "Server error — check Vercel logs!"
        });
    }
}
