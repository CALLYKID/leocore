export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message } = req.body;

        // --------------------------------------
        // 1) TEXT RESPONSE (GPT-4o-mini)
        // --------------------------------------
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
                        "You are Leocore — smart, calm, modern, helpful. Sound natural and human-like. Keep replies short unless user asks for depth. No roleplay actions."
                    },
                    { role: "user", content: message }
                ]
            })
        });

        const textData = await textResponse.json();
        const replyText = textData?.choices?.[0]?.message?.content || "Error generating response.";


        // --------------------------------------
        // 2) TEXT-TO-SPEECH (GPT-4o-mini-tts)
        // --------------------------------------
        let audioBase64 = null;

        try {
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

            const buffer = await tts.arrayBuffer();
            audioBase64 = Buffer.from(buffer).toString("base64");

        } catch (err) {
            console.log("TTS ERROR:", err.message);
        }


        // --------------------------------------
        // 3) SEND TEXT + AUDIO BACK
        // --------------------------------------
        return res.status(200).json({
            reply: replyText,
            audio: audioBase64
        });

    } catch (err) {
        return res.status(500).json({ reply: "Server error: " + err.message });
    }
}
