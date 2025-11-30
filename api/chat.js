export const runtime = "edge";

import { File, FormData } from "undici";

export default async function handler(req) {
    try {
        const { message, audio } = await req.json();
        let finalText = message;

        // 1) TRANSCRIBE AUDIO
        if (!message && audio) {
            const buf = Buffer.from(audio, "base64");
            const file = new File([buf], "audio.webm", { type: "audio/webm" });

            const form = new FormData();
            form.append("file", file);
            form.append("model", "whisper-1");

            const whisper = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
                body: form
            });

            const data = await whisper.json();
            finalText = data.text || "";
        }

        if (!finalText.trim()) {
            return new Response(JSON.stringify({
                reply: "I didn’t catch that, try speaking louder.",
                audio: null
            }), { status: 200 });
        }

        // 2) CHAT RESPONSE
        const chat = await fetch("https://api.openai.com/v1/chat/completions", {
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

        const chatData = await chat.json();
        const reply = chatData.choices?.[0]?.message?.content || "Error.";

        // 3) TTS
        const tts = await fetch("https://api.openai.com/v1/audio/speech", {
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

        const audioBuf = await tts.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuf).toString("base64");

        return new Response(JSON.stringify({
            reply,
            audio: audioBase64
        }), { status: 200 });

    } catch (err) {
        return new Response(JSON.stringify({
            reply: "Server error: " + err.message
        }), { status: 500 });
    }
}
