window.addEventListener("DOMContentLoaded", () => {

    const chatScreen = document.getElementById("chatScreen");
    const openChat = document.getElementById("openChat");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");

    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText"); // ✅ REAL TEXT TARGET

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
            fakeText.innerText = current.substring(0, charIndex++); // ✅ FIXED
            if (charIndex > current.length) {
                deleting = true;
                setTimeout(typeAnimation, 1200);
                return;
            }
        } else {
            fakeText.innerText = current.substring(0, charIndex--); // ✅ FIXED
            if (charIndex < 0) {
                deleting = false;
                promptIndex = (promptIndex + 1) % prompts.length;
            }
        }
        setTimeout(typeAnimation, deleting ? 55 : 80);
    }

    typeAnimation();

    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
    });

    if (openChat) {
        openChat.addEventListener("click", () => chatScreen.classList.add("active"));
    }

    closeChat.addEventListener("click", () => chatScreen.classList.remove("active"));

    function addMessage(text, sender) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    async function sendToGroq(textMessage) {
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: textMessage })
            });

            const raw = await res.text();
            return JSON.parse(raw);

        } catch (err) {
            return { reply: "Network error.", audio: null };
        }
    }

    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        addMessage("Processing…", "ai");

        const data = await sendToGroq(text);

        messages.lastChild.remove();
        addMessage(data.reply, "ai");

        if (data.audio) {
            new Audio("data:audio/mp3;base64," + data.audio).play();
        }
    });

});
