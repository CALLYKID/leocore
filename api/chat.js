// Force Node runtime
module.exports.config = { runtime: "nodejs20.x" };

// Import built-in Node globals for File, FormData, fetch (Node 18+)
const { File, FormData } = global;

// MAIN HANDLER
module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Parse body
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const { message, audio } = body;

        let finalText = message;

        // 1) Audio → Whisper
        if (!message && audio) {
            const audioBuffer = Buffer.from(audio, "base64");
            const audioFile = new File([audioBuffer], "audio.webm", {
                type: "audio/webm"
            });

            const form = new FormData();
            form.append("file", audioFile);
            form.append("model", "whisper-1");

            const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
                body: form
            });

            const whisperData = await whisperResp.json();
            finalText = whisperData.text || "";
        }

        if (!finalText || !finalText.trim()) {
            return res.status(200).json({
                reply: "I didn’t catch that, try speaking louder.",
                audio: null
            });
        }

        // 2) Chat Completion
        const chatResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are Leocore." },
                    { role: "user", content: finalText }
                ]
            })
        });

        const chatData = await chatResp.json();
        const reply = chatData?.choices?.[0]?.message?.content || "Error.";

        // 3) TTS
        const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-tts",
                voice: "alloy",
                input: reply
            })
        });

        const audioArr = await ttsResp.arrayBuffer();
        const audioBase64 = Buffer.from(audioArr).toString("base64");

        return res.status(200).json({
            reply,
            audio: audioBase64
        });

    } catch (err) {
        return res.status(500).json({
            error: "Server error",
            details: err.message
        });
    }
};
