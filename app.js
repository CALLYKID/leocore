/* ============================================================
   ERROR POPUP (DEV MODE)
============================================================ */
window.onerror = function (msg, src, line, col, err) {
    document.body.innerHTML +=
        "<div style='position:fixed;bottom:10px;left:10px;color:red;font-size:14px;background:#000;padding:10px;border:1px solid red;z-index:9999'>" +
        msg + "<br>Line: " + line + "</div>";
};


/* ============================================================
   MAIN APP
============================================================ */
window.addEventListener("DOMContentLoaded", () => {

    /* ------------------ SELECTORS ------------------ */
    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearBtn = document.getElementById("clearChat");
    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");


    /* ============================================================
       USER ID + LOCAL STORAGE
    ============================================================*/
    let userId = localStorage.getItem("leocore-user");
    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        localStorage.setItem("leocore-user", userId);
    }

    let savedName = localStorage.getItem("leocore-name") || null;

    let savedChat = JSON.parse(localStorage.getItem("leocore-chat") || "[]");
    savedChat.forEach(msg => addMessage(msg.text, msg.sender));


    function saveChat() {
        const arr = [];
        document.querySelectorAll(".bubble").forEach(b => {
            arr.push({
                text: b.innerText,
                sender: b.parentElement.classList.contains("user-msg") ? "user" : "ai"
            });
        });
        localStorage.setItem("leocore-chat", JSON.stringify(arr));
    }


    /* ============================================================
       AUTO SCROLL
    ============================================================*/
    function scrollToBottom() {
        setTimeout(() => {
            messages.scrollTop = messages.scrollHeight;
        }, 15);
    }


    /* ============================================================
       HERO AUTO-TYPE
    ============================================================*/
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


    /* ============================================================
       CHATGPT-STYLE MESSAGE RENDERER
    ============================================================*/
    function addMessage(text, sender) {
        const wrapper = document.createElement("div");
        wrapper.className = sender === "user" ? "user-msg" : "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.innerHTML = text.trim();

        wrapper.appendChild(bubble);
        messages.appendChild(wrapper);

        scrollToBottom();
        saveChat();
        return bubble;
    }


    /* ============================================================
       SPIRAL TYPING BUBBLE
    ============================================================*/
    function createTypingBubble() {
        const wrap = document.createElement("div");
        wrap.className = "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble typing-holder";

        bubble.innerHTML = `
            <div class="spiral-bubble">
                <div class="spiral-core"></div>
                <div class="orbit o1"></div>
                <div class="orbit o2"></div>
                <div class="orbit o3"></div>
            </div>
        `;

        wrap.appendChild(bubble);
        messages.appendChild(wrap);
        scrollToBottom();

        return wrap;
    }


    /* ============================================================
       BOOT BUBBLE
    ============================================================*/
    function createBootBubble() {
        return addMessage("…", "ai");
    }


    /* ============================================================
       STREAMING SIMULATION (FAKE STREAM)
    ============================================================*/
    async function streamMessage(fullText) {
        fullText = fullText.replace(/\n/g, "<br><br>");

        let wrapper = document.createElement("div");
        wrapper.className = "ai-msg";
        let bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.innerHTML = "";
        wrapper.appendChild(bubble);
        messages.appendChild(wrapper);

        scrollToBottom();

        let i = 0;

        while (i < fullText.length) {
            bubble.innerHTML = fullText.substring(0, i + 1);

            scrollToBottom();

            let speed = 12 + Math.random() * 22;

            await new Promise(res => setTimeout(res, speed));
            i++;
        }

        saveChat();
    }


    /* ============================================================
       SEND MESSAGE — FINAL VERSION
    ============================================================*/
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        const start = performance.now();

        let typingBubble = createTypingBubble();

        let bootBubble = null;
        let bootInterval = null;

        const bootLines = [
            "🧠 Booting core systems…",
            "🔌 Reconnecting neural mesh…",
            "⚡ Spinning up processing clusters…",
            "📡 Syncing memory banks…",
            "🔍 Scanning request… hold on…",
            "🤖 Warming up response engine…"
        ];

        let bootIndex = 0;

        const bootDelay = setTimeout(() => {
            bootBubble = createBootBubble();
            bootInterval = setInterval(() => {
                if (!bootBubble) return;
                bootBubble.innerText = bootLines[bootIndex % bootLines.length];
                bootIndex++;
            }, 1200);
        }, 1200);


        try {
            const res = await fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    userId: userId,
                    name: savedName
                })
            });

            const data = await res.json();

            const minTime = 500;
            const elapsed = performance.now() - start;

            if (elapsed < minTime) {
                await new Promise(r => setTimeout(r, minTime - elapsed));
            }

            clearTimeout(bootDelay);
            clearInterval(bootInterval);
            typingBubble.remove();
            if (bootBubble) bootBubble.parentElement.remove();

            if (data.reply.length > 35) {
                await streamMessage(data.reply);
            } else {
                addMessage(data.reply, "ai");
            }

        } catch (err) {
            typingBubble.remove();
            if (bootBubble) bootBubble.parentElement.remove();
            addMessage("⚠️ Network error. Backend is still waking up.", "ai");
        }
    }


    /* ============================================================
       EVENTS
    ============================================================*/
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });


    /* ============================================================
       KEEPALIVE — 10 minutes
    ============================================================*/
    setInterval(() => {
        fetch("https://leocore.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "__ping__", userId: "system-pinger" })
        }).catch(() => {});
    }, 600000);


    /* ============================================================
       OPEN + CLOSE CHAT
    ============================================================*/
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
        chatScreen.style.opacity = "0";

        setTimeout(() => {
            chatScreen.style.transition = "opacity 0.25s ease";
            chatScreen.style.opacity = "1";
        }, 10);
    });

    closeChat.addEventListener("click", () => {
        chatScreen.style.opacity = "0";
        setTimeout(() => chatScreen.classList.remove("active"), 250);
    });

});
