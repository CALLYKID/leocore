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
       ADD MESSAGE (USER OR AI)
    ====================================================== */
    function addMessage(text, sender) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    /* ======================================================
       ADD TYPING LOADER BUBBLE
    ====================================================== */
    function addTypingBubble() {
        const wrap = document.createElement("div");
        wrap.className = "ai-msg typing-bubble";

        wrap.innerHTML = `
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        `;

        messages.appendChild(wrap);
        messages.scrollTop = messages.scrollHeight;
        return wrap;
    }

    /* ======================================================
       SEND MESSAGE TO GROQ API
    ====================================================== */
    async function sendToGroq(textMessage) {
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: textMessage })
            });

            return await res.json();
        } catch (err) {
            return { reply: "Network error.", audio: null };
        }
    }

    /* ======================================================
       HANDLE SEND BUTTON
    ====================================================== */
    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        // User bubble
        addMessage(text, "user");
        input.value = "";

        // Typing bubble
        const loader = addTypingBubble();

        // API response
        const data = await sendToGroq(text);

        // remove loader
        loader.remove();

        // final reply
        addMessage(data.reply, "ai");
    });

});
