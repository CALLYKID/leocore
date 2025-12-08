/* ============================================================
   DEV ERROR POPUP
============================================================ */
window.onerror = function (msg, src, line) {
    document.body.innerHTML += `
        <div style="position:fixed;bottom:10px;left:10px;color:red;font-size:14px;background:#000;padding:8px;border:1px solid red;z-index:9999">
            ${msg}<br>Line: ${line}
        </div>`;
};


/* ============================================================
   MAIN APP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

    /* ELEMENTS */
    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearBtn = document.getElementById("clearChat");
    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");

    /* STREAM STATES */
    let isStreaming = false;
    let cancelStream = false;
    let ignoreNextResponse = false; // ⭐ FIX STOP-MODE

    /* ============================================================
       PERMANENT USER ID
    ============================================================ */
    const CREATOR_ID = "leo-official-001";

    function getCookie(name) {
        const v = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
        return v ? v[2] : null;
    }

    function setCookie(name, value) {
        document.cookie = `${name}=${value}; path=/; max-age=31536000`;
    }

    let userId = getCookie("leocore-user") || localStorage.getItem("leocore-user");

    if (!userId) {
        userId = CREATOR_ID;
        setCookie("leocore-user", userId);
        localStorage.setItem("leocore-user", userId);
    }

    /* ============================================================
       LOAD CHAT HISTORY
    ============================================================ */
    let savedChat = JSON.parse(localStorage.getItem("leocore-chat") || "[]");
    savedChat.forEach(m => addMessage(m.text, m.sender));

    function saveChat() {
        const arr = [];
        document.querySelectorAll(".bubble").forEach(b => {
            arr.push({
                text: b.innerHTML,
                sender: b.parentElement.classList.contains("user-msg") ? "user" : "ai"
            });
        });
        localStorage.setItem("leocore-chat", JSON.stringify(arr));
    }

    /* ============================================================
       AUTO SCROLL
    ============================================================ */
    function scrollToBottom() {
        setTimeout(() => {
            messages.scrollTop = messages.scrollHeight;
        }, 20);
    }

    /* ============================================================
       HERO AUTO TYPE
    ============================================================ */
    const prompts = [
        "Message LeoCore…",
        "Give me a task.",
        "Help me revise.",
        "Make me a plan.",
        "Let's work."
    ];

    let pi = 0, ci = 0, deleting = false;

    function typeAnimation() {
        const txt = prompts[pi];

        if (!deleting) {
            fakeText.textContent = txt.substring(0, ci++);
            if (ci > txt.length) {
                deleting = true;
                return setTimeout(typeAnimation, 900);
            }
        } else {
            fakeText.textContent = txt.substring(0, ci--);
            if (ci < 0) {
                deleting = false;
                pi = (pi + 1) % prompts.length;
            }
        }

        setTimeout(typeAnimation, deleting ? 45 : 70);
    }
    typeAnimation();


    /* ============================================================
       MESSAGE BUILDER
    ============================================================ */
    function addMessage(text, sender) {
        const wrap = document.createElement("div");
        wrap.className = sender === "user" ? "user-msg" : "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.innerHTML = text;

        wrap.appendChild(bubble);
        messages.appendChild(wrap);

        scrollToBottom();
        saveChat();
        return bubble;
    }


    /* ============================================================
       TYPING BUBBLE
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
       STREAM MESSAGE
    ============================================================ */
    async function streamMessage(full) {
        isStreaming = true;
        cancelStream = false;

        full = full.replace(/\n/g, "<br>");

        const wrap = document.createElement("div");
        wrap.className = "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble ai-streaming";

        const span = document.createElement("span");
        span.className = "stream-text";

        const cursor = document.createElement("div");
        cursor.className = "neon-cursor";

        bubble.appendChild(span);
        bubble.appendChild(cursor);
        wrap.appendChild(bubble);
        messages.appendChild(wrap);

        scrollToBottom();

        let i = 0;
        while (i < full.length) {
            if (cancelStream) break;

            span.innerHTML = full.substring(0, i + 1);
            i++;

            scrollToBottom();
            await new Promise(r => setTimeout(r, 14 + Math.random() * 18));
        }

        if (cancelStream) {
            cursor.remove();
            isStreaming = false;
            return;
        }

        cursor.classList.add("fade-out");
        setTimeout(() => cursor.remove(), 350);

        isStreaming = false;
        saveChat();
    }


    /* ============================================================
       SEND MESSAGE (STOP MODE FIXED)
    ============================================================ */
    async function sendMessage() {

        if (isStreaming) {
            cancelStream = true;
            isStreaming = false;

            ignoreNextResponse = true;

            setTimeout(() => {
                ignoreNextResponse = false;
                cancelStream = false;
                input.disabled = false;
            }, 150);

            sendBtn.innerHTML = "➤";
            sendBtn.classList.remove("stop-mode");
            return;
        }

        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        input.disabled = true;
        sendBtn.innerHTML = "■";
        sendBtn.classList.add("stop-mode");

        const loader = createTypingBubble();

        try {
            const res = await fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, userId })
            });

            const data = await res.json();

            if (ignoreNextResponse) {
                ignoreNextResponse = false;
                loader.remove();
                return;
            }

            loader.remove();
            await streamMessage(data.reply);

        } catch (err) {
            loader.remove();
            addMessage("⚠️ Network issue. Try again.", "ai");
        }

        input.disabled = false;
        sendBtn.innerHTML = "➤";
        sendBtn.classList.remove("stop-mode");
    }


    /* ============================================================
       EVENT LISTENERS
    ============================================================ */
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });

    fakeInput.addEventListener("click", () => {
        if (isStreaming) return;
        chatScreen.classList.add("active");
        setTimeout(() => input.focus(), 200);
    });

    closeChat.addEventListener("click", () => {
        if (isStreaming) return;
        chatScreen.classList.remove("active");
    });


    /* ============================================================
       ⭐ RESTORE PREMIUM HOLD-TO-RESET WIPE SYSTEM
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

        // Short tap → clear chat only
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

            createStatusUI();

            progressFill.style.transitionDuration = "3s";
            setTimeout(() => {
                progressFill.style.width = "100%";
            }, 30);

            holdTimer = setTimeout(() => {
                holdTriggered = true;

                statusBox.style.opacity = 0;
                setTimeout(() => statusBox.remove(), 400);

                messages.style.opacity = 0;

                setTimeout(() => {
                    localStorage.removeItem("leocore-chat");
                    localStorage.removeItem("leocore-name");
                    location.reload();
                }, 350);

            }, 3000);
        }

        function cancelHold() {
            clearTimeout(holdTimer);

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

});

/* ============================================================
   MODE SELECTOR LOGIC
============================================================ */
document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const mode = btn.dataset.mode;
        localStorage.setItem("leocore-mode", mode);

        addMessage(`Mode switched to **${mode}**.`, "ai");
    });
});

/* ============================================================
   QUICK TOOLS LOGIC
============================================================ */
document.querySelectorAll(".tool-btn").forEach(tool => {
    tool.addEventListener("click", () => {
        const task = tool.dataset.task;

        const prompts = {
            summarise: "Summarise this text for me:",
            plan: "Create a plan for my day:",
            study: "Explain this homework to me:",
            notes: "Generate study notes about:"
        };

        input.value = prompts[task];
        chatScreen.classList.add("active");
        input.focus();
    });
});
