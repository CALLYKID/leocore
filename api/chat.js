module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed." });
  }

  try {
    // Parse body safely
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { message } = body;

    if (!message || !message.trim()) {
      return res.status(200).json({ reply: "Say something..." });
    }

    // ===== GROQ REQUEST =====
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",   // 🔥 Very stable + low error rate
          messages: [
            {
              role: "system",
              content: "You are Leocore — fast, friendly, smart, and responsive."
            },
            { role: "user", content: message }
          ]
        })
      }
    );

    // If Groq fails → help us debug
    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("❌ GROQ API ERROR:", groqResponse.status, errText);

      return res.status(200).json({
        reply: "My brain lagged for a sec. Try again."
      });
    }

    const data = await groqResponse.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "I'm having trouble thinking right now.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("❌ SERVER CRASH:", error);

    return res.status(200).json({
      reply: "Server is overloaded right now. Try again soon."
    });
  }
};
