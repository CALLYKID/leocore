module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ reply: "Method not allowed." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const { message } = body;

        if (!message || !message.trim()) {
            return res.status(200).json({ reply: "Say something..." });
        }

        // GROQ request
        const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                messages: [
                    { role: "system", content: "You are Leocore. Respond fast, friendly, and clearly." },
                    { role: "user", content: message }
                ]
            })
        });

        // If Groq died → prevent undefined errors
        if (!groqResp.ok) {
            return res.status(200).json({
                reply: "Groq is slow right now. Try again."
            });
        }

        const data = await groqResp.json();

        const reply = data?.choices?.[0]?.message?.content;
        if (!reply) {
            return res.status(200).json({
                reply: "I'm not sure how to answer that."
            });
        }

        return res.status(200).json({ reply });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        return res.status(200).json({
            reply: "Server problem. Try again."
        });
    }
};
