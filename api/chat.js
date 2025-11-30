import { File, FormData } from "undici";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message, audio } = req.body;

        let finalText = message;

        // =====================================================
        // 1) AUDIO → WHISPER TRANSCRIPTION
        // =====================================================
        if (!message && audio) {
            const whisperForm = new FormData();

            const audioBuffer = Buffer.from(audio, "base64");

            const audioFile = new File([audioBuffer], "audio.webm", {
                type: "audio/webm",
            });

            whisperForm.append("file", audioFile);
            whisperForm.append("model", "whisper-1");

            const whisperResp = await fetch(
                "https://api.openai.com/v1/audio/transcriptions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: whisperForm,
                }
            );

            const whisperData = await whisperResp.json();
            finalText = whisperData.text || "";
        }

        if (!finalText || finalText.trim().length === 0) {
            return res.status(200).json({
                reply: "I didn’t catch that, try speaking louder.",
                audio: null,
            });
        }

        // =====================================================
        // 2) CHAT COMPLETION
        // =====================================================
        const chatRes = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are Leocore." },
                        { role: "user", content: finalText },
                    ],
                }),
            }
        );

        const chatData = await chatRes.json();
        const replyText = chatData.choices?.[0]?.message?.content || "Error.";

        // =====================================================
        // 3) TEXT → SPEECH
        // =====================================================
        const ttsRes = await fetch(
            "https://api.openai.com/v1/audio/speech",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini-tts",
                    voice: "alloy",
                    input: replyText,
                }),
            }
        );

        const audioBuf = await ttsRes.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuf).toString("base64");

        return res.status(200).json({
            reply: replyText,
            audio: audioBase64,
        });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        return res.status(500).json({ reply: "Server error: " + err.message });
    }
}
