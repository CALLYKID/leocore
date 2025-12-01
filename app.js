window.addEventListener("DOMContentLoaded", () => {

    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");

    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");

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

    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
    });

    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
    });

    function addMessage(text, sender) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

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

    // STREAMING RESPONSE
    function streamResponse(aiBox, stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        function readChunk() {
            reader.read().then(({ done, value }) => {
                if (done) return;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (let line of lines) {
                    line = line.trim();
                    if (!line.startsWith("data:")) continue;

                    const token = line.replace("data:", "").trim();
                    if (token === "END") continue;

                    // Add token with smart spacing
                    const last = aiBox.innerText.slice(-1);
                    if (last && !last.match(/\s/) && !token.startsWith(" ")) {
                        aiBox.innerText += " " + token;
                    } else {
                        aiBox.innerText += token;
                    }

                    messages.scrollTop = messages.scrollHeight;
                }

                readChunk();
            });
        }

        readChunk();
    }

    // HANDLE SEND
    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        const loader = addTypingBubble();

        try {
            const response = await fetch("/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });

            loader.remove();

            const aiBox = addMessage("", "ai");

            streamResponse(aiBox, response.body);

        } catch (err) {
            loader.remove();
            addMessage("Network error.", "ai");
        }
    });
});
