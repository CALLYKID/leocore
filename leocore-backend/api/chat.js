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
       PERMANENT USER ID (NEVER CHANGES)
    ============================================================ */
    let userId = localStorage.getItem("leocore-permanent-id");
    if (!userId) {
        userId = "user-" + crypto.randomUUID();
        localStorage.setItem("leocore-permanent-id", userId);
    }

    let savedName = localStorage.getItem("leocore-name") || null;

    /* ============================================================
       LOAD SAVED CHAT
    ============================================================ */
    let savedChat = JSON.parse(localStorage.getItem("leocore-chat") || "[]");
    savedChat.forEach(msg => addMessage(msg.text, msg.sender));

    function saveChat() {
        const arr = [];
        document.querySelectorAll(".bubble").forEach(b => {
            arr.push({
                text: b.innerHTML,
                sender:
                    b.parentElement.classList.contains("user-msg") ? "user" : "ai"
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
        }, 20);
    }


    /* ============================================================
       HERO AUTO TYPE
    ============================================================ */
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
       RENDER MESSAGE
    ============================================================ */
    function addMessage(text, sender) {
        const wrap = document.createElement("div");
        wrap.className = sender === "user" ? "user-msg" : "ai-msg";

        const b = document.createElement("div");
        b.className = "bubble";
        b.innerHTML = text;

        wrap.appendChild(b);
        messages.appendChild(wrap);

        scrollToBottom();
        saveChat();
        return b;
    }


    /* ============================================================
       SPIRAL TYPING BUBBLE
    ============================================================ */
    function createTypingBubble() {
        const wrap = document.createElement("div");
        wrap.className = "ai-msg typing-holder";
        wrap.innerHTML = `
            <div class="spiral-bubble">
                <div class="spiral-core"></div>
                <div class="orbit o1"></div>
                <div class="orbit o2"></div>
                <div class="orbit o3"></div>
            </div>
        `;
        messages.appendChild(wrap);
        scrollToBottom();
        return wrap;
    }


    /* ============================================================
       BOOT BUBBLE
    ============================================================ */
    function createBootBubble() {
        const wrap = document.createElement("div");
        wrap.className = "ai-msg";
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.innerText = "…";
        wrap.appendChild(bubble);
        messages.appendChild(wrap);
        scrollToBottom();
        return bubble;
    }


    /* ============================================================
       STREAMING STATE + STOP SYSTEM
    ============================================================ */
    let aiIsStreaming = false;
    let stopStreaming = false;


    /* ============================================================
       STREAM MESSAGE (supports STOP)
    ============================================================ */
    async function streamMessage(fullText) {
        aiIsStreaming = true;
        stopStreaming = false;

        sendBtn.innerText = "■";  
        sendBtn.classList.add("stop-mode");

        fullText = fullText.replace(/\n/g, "<br>");

        const wrap = document.createElement("div");
        wrap.className = "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble ai-streaming";

        const textSpan = document.createElement("span");
        textSpan.className = "stream-text";

        const cursor = document.createElement("div");
        cursor.className = "neon-cursor";

        bubble.appendChild(textSpan);
        bubble.appendChild(cursor);

        wrap.appendChild(bubble);
        messages.appendChild(wrap);
        scrollToBottom();

        let i = 0;

        while (i < fullText.length) {
            if (stopStreaming) break;

            textSpan.innerHTML = fullText.substring(0, i + 1);
            scrollToBottom();

            await new Promise(res => setTimeout(res, 10 + Math.random() * 20));
            i++;
        }

        cursor.classList.add("fade-out");
        setTimeout(() => cursor.remove(), 350);

        aiIsStreaming = false;
        stopStreaming = false;

        sendBtn.innerText = "➤";
        sendBtn.classList.remove("stop-mode");

        saveChat();
    }


    /* ============================================================
       SEND MESSAGE (BLOCKS while streaming)
    ============================================================ */
    async function sendMessage() {
        if (aiIsStreaming) return;  // BLOCK USER

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

            await streamMessage(data.reply);

        } catch (err) {
            typingBubble.remove();
            if (bootBubble) bootBubble.parentElement.remove();

            addMessage("⚠️ Network error. Backend isn't ready.", "ai");
        }
    }


    /* ============================================================
       SEND BUTTON
============================================================ */
    sendBtn.addEventListener("click", () => {
        if (aiIsStreaming) {
            stopStreaming = true;
            return;
        }
        sendMessage();
    });

    input.addEventListener("keydown", e => {
        if (aiIsStreaming) return;
        if (e.key === "Enter") sendMessage();
    });


    /* ============================================================
       KEEPALIVE — 10 min
============================================================ */
    setInterval(() => {
        fetch("https://leocore.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "__ping__", userId: "system-pinger" })
        });
    }, 600000);


    /* ============================================================
       PREMIUM HOLD-TO-RESET (UNCHANGED)
============================================================ */
    if (clearBtn) {
        let holdTimer = null;
        let holdTriggered = false;

        let statusBox = null;
        let progressFill = null;

        function createStatusUI() {
            statusBox = document.createElement("div");
            statusBox.className = "clear-status";

            statusBox.innerHTML = `
                <div class="clear-spiral">
                    <div class="dot d1"></div>
                    <div class="dot d2"></div>
                    <div class="dot d3"></div>
                </div>
                <div class="clear-status-text">Wiping LeoCore…</div>
                <div class="clear-progress">
                    <div class="clear-progress-fill"></div>
                </div>
            `;

            document.body.appendChild(statusBox);
            progressFill = statusBox.querySelector(".clear-progress-fill");

            setTimeout(() => statusBox.style.opacity = 1, 20);
        }

        clearBtn.addEventListener("click", () => {
            if (holdTriggered) return;
            messages.style.opacity = 0;

            setTimeout(() => {
                messages.innerHTML = "";
                localStorage.removeItem("leocore-chat");
                messages.style.opacity = 1;
            }, 200);
        });

        function startHold() {
            holdTriggered = false;
            clearBtn.classList.add("holding");

            const pulse = document.createElement("div");
            pulse.className = "fullscreen-pulse";
            document.body.appendChild(pulse);
            setTimeout(() => pulse.remove(), 400);

            createStatusUI();

            progressFill.style.transitionDuration = "3s";
            setTimeout(() => {
                progressFill.style.width = "100%";
            }, 30);

            holdTimer = setTimeout(() => {
                holdTriggered = true;
                clearBtn.classList.remove("holding");

                statusBox.style.opacity = 0;
                setTimeout(() => statusBox.remove(), 400);

                messages.style.opacity = 0;

                setTimeout(() => {
                    localStorage.clear(); // permanent ID stays untouched?
                    location.reload();
                }, 350);
            }, 3000);
        }

        function cancelHold() {
            clearTimeout(holdTimer);
            clearBtn.classList.remove("holding");

            if (!holdTriggered && statusBox) {
                statusBox.style.opacity = 0;
                setTimeout(() => statusBox.remove(), 300);
            }
        }

        clearBtn.addEventListener("mousedown", startHold);
        clearBtn.addEventListener("touchstart", startHold);

        clearBtn.addEventListener("mouseup", cancelHold);
        clearBtn.addEventListener("mouseleave", cancelHold);
        clearBtn.addEventListener("touchend", cancelHold);
        clearBtn.addEventListener("touchcancel", cancelHold);
    }


    /* ============================================================
       OPEN + CLOSE CHAT
============================================================ */
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
