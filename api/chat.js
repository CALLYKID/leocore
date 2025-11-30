export const config = {
    runtime: "edge"
};

export default async function handler(req) {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405
        });
    }

    try {
        const body = await req.json();
        const { message } = body;

        if (!message || !message.trim()) {
            return new Response(JSON.stringify({
                reply: "Say something first 😭",
                audio: null
            }), { status: 200 });
        }

        // ⚡ ULTRA FAST GROQ API (LLama-3.3)
        const chatResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are Leocore, friendly, fast, smart." },
                    { role: "user", content: message }
                ]
            })
        });

        const data = await chatResp.json();
        const reply =
            data?.choices?.[0]?.message?.content ||
            "Something went wrong 😭";

        // ⚡ TTS FAST MODE (Groq)
        const ttsResp = await fetch("https://api.groq.com/openai/v1/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-tts",
                voice: "alloy",
                input: reply
            })
        });

        const audioBuffer = await ttsResp.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");

        return new Response(JSON.stringify({
            reply,
            audio: audioBase64
        }), {
            status: 200
        });

    } catch (err) {
        return new Response(JSON.stringify({
            error: "Server error",
            details: err.message
        }), { status: 500 });
    }
}
