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
        document.querySelectorAll(".user-msg, .ai-msg").forEach(m => {
            arr.push({
                text: m.innerText,
                sender: m.classList.contains("user-msg") ? "user" : "ai"
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
       MESSAGE HELPERS
    ============================================================*/
    function addMessage(text, sender) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);
        scrollToBottom();
        saveChat();
        return div;
    }

    function createBootBubble() {
        const div = document.createElement("div");
        div.className = "ai-msg booting-msg";
        div.innerText = "…";
        messages.appendChild(div);
        scrollToBottom();
        return div;
    }

    function createTypingBubble() {
        const div = document.createElement("div");
        div.className = "typing-holder";

        div.innerHTML = `
            <div class="spiral-bubble">
                <div class="spiral-core"></div>
                <div class="orbit o1"></div>
                <div class="orbit o2"></div>
                <div class="orbit o3"></div>
            </div>
        `;

        messages.appendChild(div);
        scrollToBottom();
        return div;
    }


    /* ============================================================
       STREAMING EFFECT — THE MAGIC
    ============================================================*/
    function fakeStream(message) {
        return new Promise(resolve => {
            const container = document.createElement("div");
            container.className = "ai-msg";

            const streamBox = document.createElement("span");
            streamBox.className = "ai-streaming";
            streamBox.innerText = "";

            const cursor = document.createElement("span");
            cursor.className = "neon-cursor";

            container.appendChild(streamBox);
            container.appendChild(cursor);

            messages.appendChild(container);
            scrollToBottom();

            let i = 0;

            function typeNext() {
                if (i < message.length) {
                    streamBox.innerText += message[i];
                    i++;
                    scrollToBottom();
                    setTimeout(typeNext, 18); // speed
                } else {
                    cursor.classList.add("fade-out");
                    setTimeout(() => cursor.remove(), 350);
                    saveChat();
                    resolve();
                }
            }

            typeNext();
        });
    }


    /* ============================================================
       SEND MESSAGE — WITH STREAMING
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
            if (typingBubble) typingBubble.remove();
            if (bootBubble) bootBubble.remove();

            await fakeStream(data.reply || "No response received.");

        } catch (err) {
            clearTimeout(bootDelay);
            clearInterval(bootInterval);
            if (typingBubble) typingBubble.remove();
            if (bootBubble) bootBubble.remove();

            addMessage("⚠️ Network error. Backend is still waking up.", "ai");
        }
    }


    /* ============================================================
       BUTTON + INPUT EVENTS
    ============================================================*/
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });


    /* ============================================================
       KEEPALIVE — every 10 minutes
    ============================================================*/
    setInterval(() => {
        fetch("https://leocore.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "__ping__", userId: "system-pinger" })
        }).catch(()=>{});
    }, 600000);


    /* ============================================================
       CLEAR BUTTON — SINGLE TAP + PREMIUM HOLD RESET
    ============================================================*/
    if (clearBtn) {

        clearBtn.addEventListener("click", () => {
            if (holdTriggered) return;

            messages.style.opacity = 0;

            setTimeout(() => {
                messages.innerHTML = "";
                localStorage.removeItem("leocore-chat");
                messages.style.opacity = 1;
            }, 200);
        });

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

            setTimeout(() => {
                if (!holdTriggered) navigator.vibrate?.(40);
            }, 1400);

            holdTimer = setTimeout(() => {
                holdTriggered = true;
                clearBtn.classList.remove("holding");

                navigator.vibrate?.([100, 40, 100]);

                statusBox.style.opacity = 0;
                setTimeout(() => { statusBox.remove(); }, 400);

                messages.style.opacity = 0;

                setTimeout(() => {
                    localStorage.removeItem("leocore-chat");
                    localStorage.removeItem("leocore-name");
                    localStorage.removeItem("leocore-user");
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

        clearBtn.addEventListener("contextmenu", e => e.preventDefault());
        clearBtn.addEventListener("selectstart", e => e.preventDefault());
    }


    /* ============================================================
       OPEN CHAT
    ============================================================*/
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
        chatScreen.style.opacity = "0";

        setTimeout(() => {
            chatScreen.style.transition = "opacity 0.25s ease";
            chatScreen.style.opacity = "1";
        }, 10);
    });

    /* ============================================================
       CLOSE CHAT
    ============================================================*/
    closeChat.addEventListener("click", () => {
        chatScreen.style.transition = "opacity 0.25s ease";
        chatScreen.style.opacity = "0";

        setTimeout(() => {
            chatScreen.classList.remove("active");
        }, 250);
    });

});
