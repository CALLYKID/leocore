export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message } = req.body;

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are LEOCore, a friendly AI inside a glowing orb." },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await groqResponse.json();

        if (!data?.choices?.[0]?.message?.content) {
            return res.status(500).json({ reply: "Groq error: invalid response" });
        }

        return res.status(200).json({ reply: data.choices[0].message.content });

    } catch (err) {
        return res.status(500).json({ reply: "Server error: " + err.message });
    }
}