/* ============================================================
   PART 1 / 2 — CORE, ROUTING, UI STATE
============================================================ */

/* ============================================================
   0. REAL VIEWPORT FIX (ANDROID SAFE)
============================================================ */
function fixVh() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}
window.addEventListener("resize", fixVh);
window.addEventListener("orientationchange", fixVh);
document.addEventListener("DOMContentLoaded", fixVh);


/* ============================================================
   1. DEV ERROR POPUP (DEBUG ONLY)
============================================================ */
window.onerror = function (msg, src, line) {
    document.body.insertAdjacentHTML(
        "beforeend",
        `<div style="
            position:fixed;
            bottom:10px;left:10px;
            background:#000;
            color:red;
            padding:8px;
            border:1px solid red;
            z-index:999999;">
            <b>${msg}</b><br>Line: ${line}
        </div>`
    );
};


/* ============================================================
   2. GLOBAL STATE
============================================================ */
let isStreaming = false;
let cancelStream = false;
let ignoreNextResponse = false;


/* ============================================================
   3. DOM READY — CORE SETUP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

    /* ================= ELEMENTS ================= */
    window.chatScreen  = document.getElementById("chatScreen");
    window.closeChat   = document.getElementById("closeChat");
    window.clearBtn    = document.getElementById("clearChat");
    window.messages    = document.getElementById("messages");
    window.fakeInput   = document.getElementById("fakeInput");
    window.fakeText    = document.getElementById("fakeText");
    window.input       = document.getElementById("userInput");
    window.sendBtn     = document.getElementById("sendBtn");
    window.modePill    = document.getElementById("modePill");
    window.blurBuffer  = document.getElementById("chatBlurBuffer");
    window.appWrapper  = document.querySelector(".app-wrapper");


    /* ============================================================
       4. SCROLL ENGINE
    ============================================================ */
    window.scrollToBottom = function () {
        messages.scrollTop = messages.scrollHeight;
    };


    /* ============================================================
       5. OPEN / CLOSE CHAT (FIXED + FAST)
    ============================================================ */
    window.openChatUI = function (skipPush = false) {
        if (!skipPush && location.pathname !== "/chat") {
            history.pushState({ chat: true }, "", "/chat");
        }

        blurBuffer.style.opacity = "1";

        chatScreen.classList.add("active");
        chatScreen.style.pointerEvents = "auto";

        appWrapper.style.visibility = "hidden";
        appWrapper.style.pointerEvents = "none";

        requestAnimationFrame(() => {
            input.focus({preventScroll: true});
            scrollToBottom();
        });
    };

    window.closeChatUI = function (skipPush = false) {
    if (!skipPush && location.pathname === "/chat") {
        history.back();
        return;
    }

    chatScreen.classList.remove("active");
    chatScreen.style.pointerEvents = "none";

    blurBuffer.style.opacity = "0";

    appWrapper.style.visibility = "visible";
    appWrapper.style.pointerEvents = "auto";
};


    /* ============================================================
       6. CLICK HANDLERS
    ============================================================ */
    fakeInput.addEventListener("click", openChatUI);
    closeChat.addEventListener("click", closeChatUI);


    /* ============================================================
       7. ANDROID / BROWSER BACK BUTTON (INSTANT)
    ============================================================ */
    window.onpopstate = () => {
        if (location.pathname === "/chat") {
            openChatUI(true);
        } else {
            closeChatUI(true);
        }
    };

    if (location.pathname === "/chat") {
        openChatUI(true);
    }

});
/* ============================================================
   PART 2 / 2 — CHAT ENGINE, STREAMING, TOOLS
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    /* ============================================================
       8. USER ID SYSTEM (PERSISTENT)
    ============================================================ */
    function getCookie(name) {
        const m = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
        return m ? m[2] : null;
    }

    function setCookie(name, val) {
        document.cookie = `${name}=${val}; path=/; max-age=31536000`;
    }

    let userId =
        getCookie("leocore-user") || localStorage.getItem("leocore-user");

    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        setCookie("leocore-user", userId);
        localStorage.setItem("leocore-user", userId);
    }
   
/* ============================================================
       12. ADD MESSAGE
    ============================================================ */
    window.addMessage = function (text, sender) {
        const wrap = document.createElement("div");
        wrap.className = sender === "user" ? "user-msg" : "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.innerHTML = text;

        wrap.appendChild(bubble);
        messages.appendChild(wrap);

        scrollToBottom();
        saveChat();
    };



    /* ============================================================
       9. RESTORE CHAT HISTORY
    ============================================================ */
    const saved = JSON.parse(localStorage.getItem("leocore-chat") || "[]");

    saved.forEach((msg) => {
        addMessage(msg.text, msg.sender);
    });

    function saveChat() {
        const arr = [];
        messages.querySelectorAll(".bubble").forEach((b) => {
            arr.push({
                text: b.innerHTML,
                sender: b.parentElement.classList.contains("user-msg")
                    ? "user"
                    : "ai"
            });
        });
        localStorage.setItem("leocore-chat", JSON.stringify(arr));
    }


    /* ============================================================
       10. HOMEPAGE AUTO-TYPING (FAKE INPUT)
    ============================================================ */
    const prompts = [
        "Message LeoCore…",
        "Help me revise.",
        "Give me a plan.",
        "Let's work.",
        "I'm ready."
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

        setTimeout(typeAnimation, deleting ? 55 : 70);
    }
    typeAnimation();


    /* ============================================================
       11. MODE SYSTEM
    ============================================================ */
    const modeThemes = {
        default:   "#00eaff",
        study:     "#00aaff",
        research:  "#00ffc6",
        reading:   "#ffa840",
        deep:      "#ff0033",
        chill:     "#b400ff",
        precision: "#00eaff",
        flame:     "#ff4500"
    };

    function updateModePill() {
        const mode = localStorage.getItem("leocore-mode") || "default";

        const labels = {
            default: "DEF",
            study: "STUDY",
            research: "RSRCH",
            reading: "READ",
            deep: "DEEP",
            chill: "CHILL",
            precision: "PRCN",
            flame: "FLAME"
        };

        modePill.textContent = labels[mode];
        document.documentElement.style.setProperty("--theme-glow", modeThemes[mode]);
    }
    updateModePill();

    document.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.mode;

            localStorage.setItem("leocore-mode", mode);

            document.querySelectorAll(".mode-btn")
                .forEach((b) => b.classList.remove("active"));

            btn.classList.add("active");
            updateModePill();

            openChatUI();
        });
    });

    /* ============================================================
       13. TYPING INDICATOR
    ============================================================ */
    function createTypingBubble() {
        const wrap = document.createElement("div");
        wrap.className = "ai-msg";

        wrap.innerHTML = `
            <div class="spiral-bubble">
                <div class="spiral-core"></div>
                <div class="typing-shard"></div>
                <div class="typing-shard"></div>
                <div class="typing-shard"></div>
            </div>
        `;

        messages.appendChild(wrap);
        scrollToBottom();
        return wrap;
    }


    /* ============================================================
       14. STREAM MESSAGE (TOKEN SAFE)
    ============================================================ */
    async function streamMessage(full, flame = false) {
        isStreaming = true;
        cancelStream = false;

        full = full.replace(/\n/g, "<br>");

        const wrap = document.createElement("div");
        wrap.className = "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble ai-streaming";

        const span = document.createElement("span");
        const cursor = document.createElement("div");
        cursor.className = "neon-cursor";

        bubble.appendChild(span);
        bubble.appendChild(cursor);
        wrap.appendChild(bubble);
        messages.appendChild(wrap);

        scrollToBottom();

        let i = 0;
        const speed = () =>
            flame ? (5 + Math.random() * 7) : (14 + Math.random() * 18);

        while (i < full.length) {
            if (cancelStream) break;

            span.innerHTML = full.substring(0, i + 1);
            i++;
            scrollToBottom();

            await new Promise((r) => setTimeout(r, speed()));
        }

        cursor.remove();
        saveChat();
        isStreaming = false;
    }


    /* ============================================================
       15. SEND MESSAGE ENGINE
    ============================================================ */
    async function sendMessage() {
        if (!input.value.trim()) return;

        if (isStreaming) {
            cancelStream = true;
            ignoreNextResponse = true;
            return;
        }

        const text = input.value.trim();
        addMessage(text, "user");

        input.value = "";
        input.disabled = true;

        sendBtn.classList.add("stop-mode");
        sendBtn.innerHTML = "■";

        const typing = createTypingBubble();
        const mode = localStorage.getItem("leocore-mode") || "default";
        const flame = mode === "flame";

        try {
            const res = await fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    userId,
                    mode,
                    boost: flame ? "🔥 FLAME" : ""
                })
            });

            const data = await res.json();
            typing.remove();

            if (!ignoreNextResponse) {
                await streamMessage(data.reply, flame);
            }
            ignoreNextResponse = false;

        } catch {
            typing.remove();
            addMessage("⚠️ Network issue. Try again.", "ai");
        }

        input.disabled = false;
        sendBtn.classList.remove("stop-mode");
        sendBtn.innerHTML = "➤";
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });


    /* ============================================================
       16. HOLD TO CLEAR CHAT
    ============================================================ */
    let holdTimer = null;
    let holdActive = false;

    clearBtn.addEventListener("pointerdown", () => {
        holdTimer = setTimeout(() => {
            holdActive = true;
            messages.innerHTML = "";
            localStorage.removeItem("leocore-chat");
        }, 850);
    });

    clearBtn.addEventListener("pointerup", () => {
        holdActive = false;
        clearTimeout(holdTimer);
    });


    /* ============================================================
       17. QUICK TOOLS
    ============================================================ */
    const toolPrompts = {
        summarise: "Summarise this text:",
        plan: "Plan my day:",
        study: "Explain this homework:",
        notes: "Generate notes about:"
    };

    document.querySelectorAll(".tool-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            input.value = toolPrompts[btn.dataset.task] || "";
            openChatUI();
        });
    });

if (!window.__leoWarm__) {
    window.__leoWarm__ = true;

    fetch("https://leocore.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: "boot",
            userId: "warm",
            name: "warm"
        })
    }).catch(() => {});
}
    /* ============================================================
       18. KEEP SERVER WARM
    ============================================================ */
    setInterval(() => {
        fetch("https://leocore.onrender.com/ping").catch(() => {});
    }, 45000);

});
