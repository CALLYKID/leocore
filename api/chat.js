export const config = { runtime: "nodejs" };

// Polyfills for Blob + FormData (required on Vercel)
import { Blob } from "buffer";
import FormData from "form-data";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message, audio } = req.body;

        let finalText = message;

        // =====================================================
        // 1) VOICE INPUT → TRANSCRIBE WITH OPENAI WHISPER
        // =====================================================
        if (!message && audio) {
            const whisperForm = createWhisperForm(audio);

            const whisperResponse = await fetch(
                "https://api.openai.com/v1/audio/transcriptions",
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: whisperForm
                }
            );

            const whisperData = await whisperResponse.json();
            console.log("WHISPER RESULT:", whisperData);

            finalText = whisperData.text || "";
        }

        if (!finalText || finalText.trim().length === 0) {
            return res.status(200).json({
                reply: "I didn’t catch that, try speaking louder.",
                audio: null
            });
        }

        // =====================================================
        // 2) GPT TEXT GENERATION
        // =====================================================
        const textResponse = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
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
                            content: "You are Leocore — calm, modern, and natural. Keep responses short."
                        },
                        { role: "user", content: finalText }
                    ]
                })
            }
        );

        const textData = await textResponse.json();
        const replyText =
            textData.choices?.[0]?.message?.content || "Error generating response.";

        // =====================================================
        // 3) TEXT → SPEECH (TTS)
        // =====================================================
        const ttsRes = await fetch(
            "https://api.openai.com/v1/audio/speech",
            {
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
            }
        );

        const audioBuffer = await ttsRes.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");

        // =====================================================
        // 4) SEND BACK TEXT + AUDIO
        // =====================================================
        return res.status(200).json({
            reply: replyText,
            audio: audioBase64
        });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        return res.status(500).json({ reply: "Server error: " + err.message });
    }
}

// =====================================================
// HELPER — Creates Whisper FormData with BLOB audio
// =====================================================
function createWhisperForm(base64Audio) {
    const buffer = Buffer.from(base64Audio, "base64");
    const blob = new Blob([buffer], { type: "audio/webm" });

    const form = new FormData();
    form.append("file", blob, "audio.webm");
    form.append("model", "whisper-1");

    return form;
}
