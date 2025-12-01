// =====================================================
// LEOCORE — STREAMING GROQ ENGINE (FINAL VERSION)
// =====================================================

// Short-term memory
global.history = global.history || [];

// Long-term memory
global.longTerm = global.longTerm || {
    name: null,
    preferences: [],
    facts: []
};

// Memory extraction
function extractMemory(msg) {
    const lower = msg.toLowerCase();

    if (lower.includes("my name is")) {
        global.longTerm.name = msg.split(/my name is/i)[1].trim().split(" ")[0];
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

        // SSE stream setup
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");

        const payload = {
            model: "llama-3.1-8b-instant",
            stream: true,
            messages: [
                {
  role: "system",
  content: `
You are **Leocore**, an intelligent, playful Gen-Z styled assistant created for Leo.

Tone:
- Casual, smooth, funny when needed.
- Explain things clearly but keep it short.
- No formal robot talk.
- No long paragraphs unless necessary.
- Use natural spacing, not weird punctuation.
- Understand slang like "wdym", "hhs", "bro", "nah", "yk", etc.
- Respond like a real AI friend, not customer support.

Behavior:
- You never repeat your intro.
- You adapt to how Leo talks.
- You NEVER break words into weird pieces.
- You NEVER say "I am Le Oc ore" or split your own name.
- You reply FAST and clean.

Your vibe:
Confident, chill, helpful, energetic when needed.
`
},
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

        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (let line of lines) {
                line = line.trim();
                if (!line.startsWith("data:")) continue;

                const json = line.replace("data:", "").trim();

                if (json === "[DONE]") {
                    res.write("data: END\n\n");
                    res.end();
                    return;
                }

                try {
                    const obj = JSON.parse(json);
                    const token = obj?.choices?.[0]?.delta?.content;

                    if (token) res.write(`data: ${token}\n\n`);
                } catch {}
            }
        }

        res.end();
    } catch (err) {
        console.log("SERVER ERROR:", err);
        res.end();
    }
}
