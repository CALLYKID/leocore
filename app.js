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
       ADD MESSAGE BUBBLE
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
       TYPING DOTS LOADER
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
       STREAM TEXT WITH PROPER SPACING (FINAL VERSION)
    ====================================================== */
    function streamResponse(aiBox, stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        function readChunk() {
            reader.read().then(({ done, value }) => {
                if (done) return;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (let line of lines) {
                    line = line.trim();
                    if (!line || !line.startsWith("data:")) continue;

                    const jsonString = line.replace("data:", "").trim();
                    if (jsonString === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(jsonString);
                        const token = parsed.choices?.[0]?.delta?.content;

                        if (token) {
                            const lastChar = aiBox.textContent.slice(-1);

                            // spacing fix so words don’t glue together
                            if (lastChar && !lastChar.match(/\s/) && !token.startsWith(" ")) {
                                aiBox.textContent += " " + token;
                            } else {
                                aiBox.textContent += token;
                            }

                            messages.scrollTop = messages.scrollHeight;
                        }
                    } catch (err) {
                        console.log("Stream JSON error:", err);
                    }
                }

                readChunk();
            });
        }

        readChunk();
    }


    /* ======================================================
       HANDLE SEND BUTTON (STREAMING MODE)
    ====================================================== */
    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        // Show user message
        addMessage(text, "user");
        input.value = "";

        // Show typing dots
        const loader = addTypingBubble();

        try {
            const response = await fetch("/api/chat/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });

            loader.remove();

            // Create empty AI bubble
            const aiBox = addMessage("", "ai");

            // Stream tokens
            streamResponse(aiBox, response.body);

        } catch (err) {
            loader.remove();
            addMessage("Network error.", "ai");
        }
    });

});
