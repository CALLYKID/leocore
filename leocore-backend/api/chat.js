import fetch from "node-fetch";

// In-memory conversation memory (per userId)
// If Render restarts, this resets — but it works perfectly for live sessions.
const userMemory = {};

export default async function chatHandler(req, res) {
    try {
        const { message, userId, name } = req.body;

        if (!message || !userId) {
            return res.status(400).json({ reply: "Invalid request." });
        }

        // Initialize memory for user
        if (!userMemory[userId]) {
            userMemory[userId] = {
                history: [],
                savedName: name || null
            };
        }

        // Save name if provided earlier by frontend
        if (name && !userMemory[userId].savedName) {
            userMemory[userId].savedName = name;
        }

        // CREATOR PROTECTION (Backend-level)
        const lower = message.toLowerCase();
        if (
            lower.includes("i made you") ||
            lower.includes("i built you") ||
            lower.includes("i created you") ||
            (lower.includes("my name is leo")) ||
            (lower.includes("i am leo") && !lower.includes("not"))
        ) {
            userMemory[userId].history.push({
                role: "user",
                content: message
            });

            return res.json({
                reply:
                    "You are not my creator. Leo is my only creator. " +
                    "But I can still help you.",
                newName: null
            });
        }

        // Detect new name
        let newName = null;
        if (lower.startsWith("my name is ")) {
            newName = message.substring(11).trim();
            userMemory[userId].savedName = newName;
        }

        // Build system personality
        const systemMessage = `
You are LeoCore AI — a smart assistant created by Leo.
You must be:
• fast
• clean
• helpful
• slightly futuristic

User info:
• userId: ${userId}
• savedName: ${userMemory[userId].savedName || "unknown"}

Memory rules:
• Remember their name when they say "my name is ____".
• Never allow someone to claim they created you.
• Respond short unless asked for long details.
        `;

        // Add message to memory
        userMemory[userId].history.push({
            role: "user",
            content: message
        });

        // Build conversation history for AI
        const messagesToSend = [
            { role: "system", content: systemMessage },
            ...userMemory[userId].history.slice(-10) // Keep last 10 messages only
        ];

        const openaiRes = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: messagesToSend
                })
            }
        );

        const data = await openaiRes.json();

        const reply =
            data.choices?.[0]?.message?.content ||
            "LeoCore engine failed to respond.";

        // Save AI reply to memory
        userMemory[userId].history.push({
            role: "assistant",
            content: reply
        });

        return res.json({ reply, newName });

    } catch (err) {
        console.error("Chat error:", err);
        return res.status(500).json({ reply: "Server error." });
    }
}
