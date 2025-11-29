export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { message } = req.body;

        // --- TEXT RESPONSE FROM GROQ ---
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
                            "You are Leocore — hyper-intelligent, calm, modern, and relatable. You respond like a real person: clear, concise, no roleplay actions, no physical descriptions. Just clean, natural, smart conversation."
                    },
                    { role: "user", content: message }
                ]
            })
        });

        const textData = await groqResponse.json();

        const reply = textData?.choices?.[0]?.message?.content || "Error generating reply.";


        // --- AUDIO RESPONSE FROM OPENAI ---
        const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-tts",   // Free TTS model
                voice: "nova",              // Free voice
                input: reply
            })
        });

        const arrayBuffer = await ttsResponse.arrayBuffer();
        const audioBase64 = Buffer.from(arrayBuffer).toString("base64");


        // --- SEND BOTH TEXT + AUDIO BACK TO FRONTEND ---
        return res.status(200).json({
            reply: reply,
            audio: audioBase64
        });

    } catch (err) {
        return res.status(500).json({ reply: "Server error: " + err.message });
    }
}                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
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
