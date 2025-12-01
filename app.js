window.addEventListener("DOMContentLoaded", () => {

    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");

    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");

    // -------------------------------------------------------
    // TYPEWRITER PLACEHOLDER
    // -------------------------------------------------------
    const prompts = [
        "Message Leocore…",
        "Give me a summer plan.",
        "Create a custom meal plan.",
        "Tell me something funny.",
        "Help me with homework."
    ];

    let i = 0, j = 0, del = false;
    function animate() {
        let cur = prompts[i];
        fakeText.textContent = cur.substring(0, j);

        if (!del) {
            j++;
            if (j > cur.length) {
                del = true;
                setTimeout(animate, 1200);
                return;
            }
        } else {
            j--;
            if (j < 0) {
                del = false;
                i = (i + 1) % prompts.length;
            }
        }
        setTimeout(animate, del ? 60 : 90);
    }
    animate();

    // -------------------------------------------------------
    // OPEN/CLOSE CHAT
    // -------------------------------------------------------
    fakeInput.addEventListener("click", () => chatScreen.classList.add("active"));
    closeChat.addEventListener("click", () => chatScreen.classList.remove("active"));

    // -------------------------------------------------------
    // MESSAGE HELPERS
    // -------------------------------------------------------
    function addUserMessage(text) {
        const div = document.createElement("div");
        div.className = "user-msg";
        div.textContent = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function createAIMessageBox() {
        const div = document.createElement("div");
        div.className = "ai-msg";
        div.textContent = "";
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    function addTypingBubble() {
        const div = document.createElement("div");
        div.className = "typing-bubble";
        div.innerHTML = `
            <span class="dot d1"></span>
            <span class="dot d2"></span>
            <span class="dot d3"></span>
        `;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    // -------------------------------------------------------
    // STREAM AI RESPONSE
    // -------------------------------------------------------
    async function streamResponse(text, aiBox, loader) {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        loader.remove();

        if (!res.body) {
            aiBox.textContent = "Streaming error.";
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            lines.forEach(line => {
                line = line.trim();
                if (!line.startsWith("data:")) return;

                const token = line.replace("data:", "").trim();
                if (token && token !== "END") {
                    aiBox.textContent += token;
                    messages.scrollTop = messages.scrollHeight;
                }
            });
        }
    }

    // -------------------------------------------------------
    // SEND MESSAGE
    // -------------------------------------------------------
    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        addUserMessage(text);
        input.value = "";

        const loader = addTypingBubble();
        const aiBox = createAIMessageBox();

        await streamResponse(text, aiBox, loader);
    });
});
