export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const body = req.body;

        // -----------------------------
        // 1) HANDLE TEXT OR AUDIO INPUT
        // -----------------------------
        let userMessage = "";

        if (body.message) {
            // TEXT MESSAGE
            userMessage = body.message;

        } else if (body.audio) {
            // AUDIO MESSAGE → Whisper STT
            const audioBuffer = Buffer.from(body.audio, "base64");

            const sttResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: (() => {
                    const form = new FormData();
                    form.append("model", "gpt-4o-mini-tts");
                    form.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "audio.webm");
                    return form;
                })()
            });

            const sttData = await sttResponse.json();
            userMessage = sttData.text || "I couldn't hear that clearly.";
        }


        // -----------------------------
        // 2) GENERATE AI TEXT RESPONSE
        // -----------------------------
        const textResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
                        "You are Leocore — smart, calm, modern, helpful. Sound human but not cringe. No roleplay actions."
                    },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const textData = await textResponse.json();
        const replyText = textData?.choices?.[0]?.message?.content || "Error generating response.";


        // -----------------------------
        // 3) GENERATE TTS AUDIO
        // -----------------------------
        let audioBase64 = null;

        try {
            const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini-tts",
                    input: replyText,
                    voice: "alloy"
                })
            });

            const audioArrayBuf = await ttsResponse.arrayBuffer();
            audioBase64 = Buffer.from(audioArrayBuf).toString("base64");

        } catch (err) {
            console.log("TTS ERROR:", err.message);
        }


        // -----------------------------
        // 4) SEND EVERYTHING BACK
        // -----------------------------
        return res.status(200).json({
            reply: replyText,
            audio: audioBase64
        });

    } catch (err) {
        return res.status(500).json({
            reply: "Server error: " + err.message
        });
    }
}
