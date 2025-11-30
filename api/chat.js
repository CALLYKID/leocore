export const config = { runtime: "edge" };

export default async function handler(req) {
    try {
        const { message, audio } = await req.json();

        let finalText = message;

        // ============================================
        // 1) TRANSCRIBE AUDIO → WHISPER
        // ============================================
        if (!message && audio) {
            const buffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));

            const file = new File([buffer], "audio.webm", { type: "audio/webm" });

            const form = new FormData();
            form.append("file", file);
            form.append("model", "whisper-1");

            const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: form
            });

            const whisperJson = await whisperRes.json();
            finalText = whisperJson.text || "";
        }

        if (!finalText.trim()) {
            return new Response(JSON.stringify({
                reply: "I didn’t catch that, try speaking louder.",
                audio: null
            }), { status: 200 });
        }

        // ============================================
        // 2) TEXT → GPT
        // ============================================
        const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are Leocore — calm, modern, short replies." },
                    { role: "user", content: finalText }
                ]
            })
        });

        const chatJson = await chatRes.json();
        const replyText = chatJson.choices?.[0]?.message?.content || "Error generating response.";

        // ============================================
        // 3) TEXT → TTS
        // ============================================
        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
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

        const audioBuffer = await ttsRes.arrayBuffer();
        const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

        // ============================================
        // 4) RETURN JSON
        // ============================================
        return new Response(JSON.stringify({
            reply: replyText,
            audio: audioBase64
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({
            reply: "Server error: " + err.message
        }), { status: 500 });
    }
}
