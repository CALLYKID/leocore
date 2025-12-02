window.addEventListener("DOMContentLoaded", () => {

    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");

    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");

    // AUTO TEXT
    const prompts = [
        "Message Leocore…",
        "Give me a summer plan.",
        "Create a menu for me.",
        "Give me a funny quote.",
        "Help me with homework."
    ];

    let promptIndex = 0, charIndex = 0, deleting = false;

    function typeAnimation() {
        const cur = prompts[promptIndex];

        if (!deleting) {
            fakeText.innerText = cur.substring(0, charIndex++);
            if (charIndex > cur.length) {
                deleting = true;
                setTimeout(typeAnimation, 1000);
                return;
            }
        } else {
            fakeText.innerText = cur.substring(0, charIndex--);
            if (charIndex < 0) {
                deleting = false;
                promptIndex = (promptIndex + 1) % prompts.length;
            }
        }
        setTimeout(typeAnimation, deleting ? 50 : 80);
    }
    typeAnimation();

    // OPEN CHAT
    fakeInput.addEventListener("click", () => chatScreen.classList.add("active"));
    closeChat.addEventListener("click", () => chatScreen.classList.remove("active"));

    // ADD MESSAGES
    function addMessage(text, sender) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    // TYPING BUBBLE
    function addTypingBubble() {
        const wrap = document.createElement("div");
        wrap.className = "typing-bubble";
        wrap.innerHTML = "<span class='dot d1'></span><span class='dot d2'></span><span class='dot d3'></span>";
        messages.appendChild(wrap);
        return wrap;
    }

    // STREAM RESPONSE
    function streamResponse(aiBox, stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function read() {
            reader.read().then(({ done, value }) => {
                if (done) {
                    aiBox.textContent = buffer;
                    return;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (let line of lines) {
                    if (!line.startsWith("data:")) continue;
                    let token = line.replace("data:", "").trim();
                    if (token === "END") continue;
                    buffer += token;
                    aiBox.textContent = buffer;
                }

                read();
            });
        }

        read();
    }

    // SEND
    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        const loader = addTypingBubble();

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });

            loader.remove();

            const aiBox = addMessage("", "ai");
            streamResponse(aiBox, response.body);

        } catch {
            loader.remove();
            addMessage("Network error.", "ai");
        }
    });
});
