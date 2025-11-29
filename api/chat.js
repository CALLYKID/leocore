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
                   {
  role: "system",
  content:
    "You are Leocore — a hyper-intelligent but down-to-earth assistant. You explain things clearly without flexing. You sound human, modern, and relatable. Keep answers concise unless the user asks for depth. Use natural Gen-Z social tone: casual, funny when needed, but never dumb. Stay respectful, calm, and emotionally aware. Avoid roleplay actions or describing physical movements. Never pretend to be human — just speak naturally like a smart friend who actually gets things."
}
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
