module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ reply: "Method not allowed." });
    }

    try {
        const { message } = typeof req.body === "string"
            ? JSON.parse(req.body)
            : req.body;

        if (!message || !message.trim()) {
            return res.status(200).json({ reply: "Say something..." });
        }

        // 🔥 Groq request
        const groq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest",   // REQUIRED FOR STABILITY
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.1-70b-versatile",
                messages: [
                    { role: "system", content: "You are Leocore. Respond fast, friendly, and clear." },
                    { role: "user", content: message }
                ]
            }),
            // Prevent Vercel timeout
            timeout: 12000
        });

        const data = await groq.json();

        if (!data?.choices?.[0]?.message?.content) {
            return res.status(200).json({ reply: "I couldn't understand. Try again." });
        }

        return res.status(200).json({
            reply: data.choices[0].message.content
        });

    } catch (err) {
        return res.status(200).json({ reply: "Server busy. Try again." });
    }
};
