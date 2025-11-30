// =====================================================
// LEOCORE — STABLE GROQ BACKEND + SOFT MEMORY
// =====================================================

// In-memory storage (lives while Vercel instance is active)
let memory = {
    facts: [],
    preferences: [],
    name: "User"
};

function updateMemory(message) {
    message = message.toLowerCase();

    // NAME DETECTION
    if (message.includes("my name is")) {
        const parts = message.split("my name is")[1].trim().split(" ");
        const name = parts[0].replace(/[^a-z]/gi, "");
        memory.name = name;
    }

    // "remember that..."
    if (message.startsWith("remember that")) {
        const fact = message.replace("remember that", "").trim();
        if (fact.length > 3) memory.facts.push(fact);
    }

    // "i like..." → preference
    if (message.startsWith("i like")) {
        const pref = message.replace("i like", "").trim();
        memory.preferences.push(pref);
    }

    // "forget..." command
    if (message.startsWith("forget")) {
        memory = { name: "User", facts: [], preferences: [] };
    }
}

module.exports = async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
        return res.status(200).json({ reply: "Use POST only." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const message = body?.message?.trim() || "";

        if (!message) {
            return res.status(200).json({ reply: "Say something and I’ll reply." });
        }

        // 🧠 Update memory based on the new message
        updateMemory(message);

        // Build memory summary for the model
        const memoryContext = `
Known name: ${memory.name}
Known preferences: ${memory.preferences.join(", ") || "none"}
Known facts: ${memory.facts.join("; ") || "none"}
`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                max_tokens: 300,
                temperature: 0.8,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are Leocore. Respond fast, friendly, and concise. Use memory naturally."
                    },
                    {
                        role: "system",
                        content: "User memory:\n" + memoryContext
                    },
                    {
                        role: "user",
                        content: message
                    }
                ]
            })
        });

        let data;

        try {
            data = await groqRes.json();
        } catch {
            return res.status(200).json({
                reply: "I’m processing a lot — try again in a sec."
            });
        }

        const reply = data?.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(200).json({
                reply: "My brain lagged — repeat that?"
            });
        }

        return res.status(200).json({ reply });

    } catch (err) {
        return res.status(200).json({
            reply: "Server busy. Try again."
        });
    }
};
