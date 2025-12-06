/* ============================================================
   GLOBAL ERROR OVERLAY (DEV ONLY)
============================================================ */
window.onerror = function (msg, src, line, col, err) {
    document.body.innerHTML +=
        "<div style='position:fixed;bottom:10px;left:10px;color:red;font-size:14px;background:#000;padding:10px;border:1px solid red;z-index:9999'>" +
        msg + "<br>Line: " + line + "</div>";
};


/* ============================================================
   MAIN
============================================================ */
window.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------------------
       SELECTORS
    ----------------------------------------------------- */
    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");
    const clearBtn = document.getElementById("clearChat");

    /* -----------------------------------------------------
       USER ID (PERSISTENT)
    ----------------------------------------------------- */
    let userId = localStorage.getItem("leocore-user");
    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        localStorage.setItem("leocore-user", userId);
    }

    /* -----------------------------------------------------
       NAME MEMORY (PERSISTENT)
    ----------------------------------------------------- */
    let savedName = localStorage.getItem("leocore-name") || null;


    /* -----------------------------------------------------
       RESTORE CHAT HISTORY
    ----------------------------------------------------- */
    let savedChat = JSON.parse(localStorage.getItem("leocore-chat"));
    if (savedChat) {
        savedChat.forEach(msg => addMessage(msg.text, msg.sender, false));
        scrollToBottom();
    }


    /* -----------------------------------------------------
       SAVE CHAT
    ----------------------------------------------------- */
    function saveChat() {
        const allMessages = [...document.querySelectorAll("#messages div")].map(x => ({
            text: x.innerText,
            sender: x.classList.contains("user-msg") ? "user" : "ai"
        }));
        localStorage.setItem("leocore-chat", JSON.stringify(allMessages));
    }


    /* -----------------------------------------------------
       CLEAR CHAT BUTTON
    ----------------------------------------------------- */
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            localStorage.removeItem("leocore-chat");
            localStorage.removeItem("leocore-name");
            messages.innerHTML = "";
            savedName = null;
        });
    }


    /* -----------------------------------------------------
       AUTO SCROLL
    ----------------------------------------------------- */
    function scrollToBottom() {
        setTimeout(() => {
            messages.scrollTop = messages.scrollHeight;
        }, 20);
    }


    /* -----------------------------------------------------
       AUTO-TYPING PLACEHOLDER
    ----------------------------------------------------- */
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


    /* -----------------------------------------------------
       OPEN CHAT + ANALYTICS EVENT
    ----------------------------------------------------- */
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");

        gtag('event', 'user_opened_chat', {
            userId,
            timestamp: Date.now()
        });
    });

    closeChat.addEventListener("click", () => chatScreen.classList.remove("active"));


    /* -----------------------------------------------------
       MESSAGE HELPERS
    ----------------------------------------------------- */
    function addMessage(text, sender, save = true) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);

        if (save) saveChat();
        scrollToBottom();

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
        scrollToBottom();
        return wrap;
    }


    /* -----------------------------------------------------
       SEND MESSAGE
    ----------------------------------------------------- */
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        /* Detect name from message */
        const nameMatch = text.match(/(i'?m|i am|my name is)\s+([a-zA-Z]+)/i);
        if (nameMatch) {
            savedName = nameMatch[2];
            localStorage.setItem("leocore-name", savedName);
        }

        /* Analytics */
        gtag('event', 'message_sent', {
            userId,
            message: text,
            timestamp: Date.now()
        });

        const loader = addTypingBubble();
        const start = performance.now();

        try {
            const response = await fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    userId,
                    userName: savedName
                })
            });

            const data = await response.json();

            const minTime = 600;
            const elapsed = performance.now() - start;
            if (elapsed < minTime) {
                await new Promise(res => setTimeout(res, minTime - elapsed));
            }

            loader.remove();

            addMessage(data.reply || "No response received.", "ai");

            gtag('event', 'message_received', {
                userId,
                response: data.reply || "",
                timestamp: Date.now()
            });

        } catch (err) {
            loader.remove();
            addMessage("Network error.", "ai");
        }
    }

    /* -----------------------------------------------------
       INPUT EVENTS
    ----------------------------------------------------- */
    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });

});
