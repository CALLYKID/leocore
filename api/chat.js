// =====================================================
// LEOCORE — NORMAL CHAT ENDPOINT (NO STREAMING)
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

        const payload = {
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: "You are Leocore, a modern AI." },
                { role: "user", content: message }
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

        const reply = data?.choices?.[0]?.message?.content || "Empty response.";

        return res.status(200).json({ reply });

    } catch (err) {
        console.log("SERVER ERROR:", err);
        return res.status(500).json({ reply: "Server error." });
    }
}
