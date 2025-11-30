export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        let userMessage = "";
        let audioBase64 = null;

        // If user sent text
        if (req.body.message) {
            userMessage = req.body.message;
        }

        // If user sent audio -> transcribe with Whisper
        if (req.body.audio) {
            const audioBuffer = Buffer.from(req.body.audio, "base64");

            const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: (() => {
                    const formData = new FormData();
                    formData.append("file", new Blob([audioBuffer]), "audio.webm");
                    formData.append("model", "whisper-1");
                    return formData;
                })()
            });

            const whisperJson = await whisperRes.json();
            userMessage = whisperJson.text || "";
        }

        if (!userMessage.trim()) {
            return res.status(400).json({ reply: "I didn’t catch that, try speaking louder." });
        }

        // 🌟 AI TEXT
        const textRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are Leocore — smart, calm, helpful, modern. Keep it short unless asked. No roleplay actions."
                    },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const textJson = await textRes.json();
        const replyText = textJson?.choices?.[0]?.message?.content || "Something went wrong.";

        // 🌟 AI AUDIO (TTS)
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
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

        const audioBuf = await ttsRes.arrayBuffer();
        const audioReplyBase64 = Buffer.from(audioBuf).toString("base64");

        return res.status(200).json({
            reply: replyText,
            audio: audioReplyBase64
        });

    } catch (err) {
        return res.status(500).json({ reply: "Server error: " + err.message });
    }
}
