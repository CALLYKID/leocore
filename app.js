window.addEventListener("DOMContentLoaded", () => {

    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");

    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");

    /* ======================================================
       AUTO–TYPING PLACEHOLDER
    ====================================================== */
    const prompts = [
        "Message Leocore…",
        "Give me a summer plan.",
        "Create a menu for me.",
        "Give me a funny quote.",
        "Help me with homework."
    ];

    let promptIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function typeAnimation() {
        const cur = prompts[promptIndex];

        if (!deleting) {
            fakeText.innerText = cur.substring(0, charIndex++);
            if (charIndex > cur.length) {
                deleting = true;
                setTimeout(typeAnimation, 1200);
                return;
            }
        } else {
            fakeText.innerText = cur.substring(0, charIndex--);
            if (charIndex < 0) {
                deleting = false;
                promptIndex = (promptIndex + 1) % prompts.length;
            }
        }
        setTimeout(typeAnimation, deleting ? 55 : 80);
    }

    typeAnimation();


    /* ======================================================
       OPEN CHAT WHEN CLICKING FAKE BAR
    ====================================================== */
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
    });

    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
    });


    /* ======================================================
       TYPED AI MESSAGE (LETTER BY LETTER)
    ====================================================== */
    function typeMessage(text, element, speed = 15) {
        let i = 0;
        function typing() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(typing, speed);
            }
        }
        typing();
    }


    /* ======================================================
       ADD USER MESSAGE / AI MESSAGE
    ====================================================== */
    function addMessage(text, sender, skipTyping = false) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";

        if (sender === "ai" && !skipTyping) {
            // Start empty and animate
            messages.appendChild(div);
            typeMessage(text, div);
        } else {
            div.innerText = text;
            messages.appendChild(div);
        }

        messages.scrollTop = messages.scrollHeight;
        return div;
    }


    /* ======================================================
       ADD TYPING LOADER (...)
    ====================================================== */
    function addTypingBubble() {
        const wrap = document.createElement("div");
        wrap.className = "typing-bubble";

        wrap.innerHTML = `
            <span class="dot d1"></span>
            <span class="dot d2"></span>
            <span class="dot d3"></span>
        `;

        messages.appendChild(wrap);
        messages.scrollTop = messages.scrollHeight;
        return wrap;
    }


    /* ======================================================
       SEND TO GROQ API
    ====================================================== */
    async function sendToGroq(textMessage) {
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: textMessage })
            });

            const data = await res.json();

            if (!data.reply || data.reply === "Error." || data.reply.startsWith("Error")) {
                return { reply: "I didn’t quite catch that. Try asking again in a different way!" };
            }

            return data;

        } catch (err) {
            return { reply: "Network error." };
        }
    }


    /* ======================================================
       HANDLE SEND MESSAGE
    ====================================================== */
    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        // User bubble
        addMessage(text, "user", true);
        input.value = "";

        // Typing bubble
        const loader = addTypingBubble();

        // Wait for Groq
        const data = await sendToGroq(text);

        // Remove typing bubble
        loader.remove();

        // AI animated response
        addMessage(data.reply, "ai");
    });

});
