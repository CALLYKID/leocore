module.exports.config = { runtime: "nodejs20.x" };

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const { message } = body;

        if (!message || !message.trim()) {
            return res.status(200).json({
                reply: "Say something and I’ll reply instantly.",
                audio: null
            });
        }

        // ============================
        // 🚀 GROQ TEXT-GENERATION
        // ============================
        const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                messages: [
                    { role: "system", content: "You are Leocore, a fast, helpful AI with a friendly vibe." },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await groqResp.json();
        console.log("GROQ RESPONSE:", data);

        const reply = data?.choices?.[0]?.message?.content || "Error talking to Groq.";

        return res.status(200).json({
            reply,
            audio: null
        });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        return res.status(500).json({
            reply: "Server issue. Try again.",
            audio: null
        });
    }
};
