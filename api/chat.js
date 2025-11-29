export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message } = req.body;

        // 1️⃣ Get text reply from Groq
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
                          "You are Leocore — a smart, helpful, relatable, modern assistant. Clear, calm, Gen-Z vibe. No roleplay actions, no physical movement descriptions. Just natural and human-like."
                    },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await groqResponse.json();
        const replyText = data?.choices?.[0]?.message?.content || "Error.";

        // 2️⃣ Turn reply text into speech using OpenAI TTS
        const tts = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-tts",
                voice: "alloy",
                input: replyText
            })
        });

        const audioBuffer = await tts.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString("base64");

        // 3️⃣ Return BOTH text + audio
        return res.status(200).json({
            reply: replyText,
            audio: base64Audio
        });

    } catch (err) {
        return res.status(500).json({ reply: "Server error: " + err.message });
    }
}
