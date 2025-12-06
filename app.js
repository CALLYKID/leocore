window.onerror = function (msg, src, line, col, err) {
    document.body.innerHTML +=
        "<div style='position:fixed;bottom:10px;left:10px;color:red;font-size:14px;background:#000;padding:10px;border:1px solid red;z-index:9999'>" +
        msg + "<br>Line: " + line + "</div>";
};

window.addEventListener("DOMContentLoaded", () => {

    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");

    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");

    // ==========================================
    // USER ID (persists across sessions)
    // ==========================================
    let userId = localStorage.getItem("leocore-user");
    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        localStorage.setItem("leocore-user", userId);
    }

    // ==========================================
    // AUTO-TYPING PLACEHOLDER
    // ==========================================
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
                setTimeout(typeAnimation, 900);
                return;
            }
        } else {
            fakeText.innerText = cur.substring(0, charIndex--);
            if (charIndex < 0) {
                deleting = false;
                promptIndex = (promptIndex + 1) % prompts.length;
            }
        }
        setTimeout(typeAnimation, deleting ? 45 : 70);
    }
    typeAnimation();

    // ==========================================
    // OPEN CHAT
    // ==========================================
    fakeInput.addEventListener("click", () => chatScreen.classList.add("active"));
    closeChat.addEventListener("click", () => chatScreen.classList.remove("active"));

    // ==========================================
    // MESSAGE UI HELPERS
    // ==========================================
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
            <span class='dot d1'></span>
            <span class='dot d2'></span>
            <span class='dot d3'></span>
        `;
        messages.appendChild(wrap);
        messages.scrollTop = messages.scrollHeight;
        return wrap;
    }

    // ==========================================
    // SEND MESSAGE — NON STREAMING VERSION
    // (Render-compatible + fixed typing bubble)
    // ==========================================
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        const loader = addTypingBubble();
        const start = performance.now();

        try {
            const response = await fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    userId: userId
                })
            });

            const data = await response.json();

            // Guarantee bubble shows at least 600ms
            const minTime = 600;
            const elapsed = performance.now() - start;

            if (elapsed < minTime) {
                await new Promise(res => setTimeout(res, minTime - elapsed));
            }

            loader.remove();

            const aiBox = addMessage("", "ai");
            aiBox.textContent = data.reply || "No response received.";

        } catch (err) {
            loader.remove();
            addMessage("Network error.", "ai");
        }
    }

    // ==========================================
    // INPUT EVENTS
    // ==========================================
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });
});
