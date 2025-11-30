window.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================
    const chatScreen = document.getElementById("chatScreen");
    const openChat = document.getElementById("openChat");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const fakeInput = document.getElementById("fakeInput");


    // =========================================================
    // AUTO-TYPING PLACEHOLDER
    // =========================================================
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
        const current = prompts[promptIndex];

        if (!deleting) {
            // Typing forward
            fakeInput.innerText = current.substring(0, charIndex++);
            if (charIndex > current.length) {
                deleting = true;
                setTimeout(typeAnimation, 1300); // pause at full text
                return;
            }
        } else {
            // Backspacing
            fakeInput.innerText = current.substring(0, charIndex--);
            if (charIndex < 0) {
                deleting = false;
                promptIndex = (promptIndex + 1) % prompts.length;
            }
        }

        setTimeout(typeAnimation, deleting ? 55 : 80);
    }

    typeAnimation();


    // =========================================================
    // OPEN / CLOSE CHAT
    // =========================================================
    openChat.addEventListener("click", () => {
        chatScreen.classList.add("active");
    });

    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
    });

    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
    });


    // =========================================================
    // ADD MESSAGE TO UI
    // =========================================================
    function addMessage(text, sender) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }


    // =========================================================
    // SEND MESSAGE TO BACKEND
    // =========================================================
    async function sendToGroq(textMessage) {
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: textMessage })
            });

            const raw = await res.text();

            try {
                return JSON.parse(raw);
            } catch {
                return { reply: "Backend returned invalid JSON.", audio: null };
            }

        } catch (err) {
            return { reply: "Network error.", audio: null };
        }
    }


    // =========================================================
    // SEND BUTTON
    // =========================================================
    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        addMessage("Processing…", "ai");

        const data = await sendToGroq(text);

        // remove loading
        messages.lastChild.remove();

        addMessage(data.reply, "ai");

        if (data.audio) {
            const audio = new Audio("data:audio/mp3;base64," + data.audio);
            audio.play().catch(() => {});
        }
    });

});
