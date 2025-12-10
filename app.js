/* ============================================================
   0. REAL VIEWPORT FIX  (MUST MATCH CSS var(--vh))
============================================================ */
function fixVh() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
}
window.addEventListener("resize", fixVh);
window.addEventListener("orientationchange", fixVh);
document.addEventListener("DOMContentLoaded", fixVh);


/* ============================================================
   1. DEV ERROR POPUP  (DO NOT REMOVE)
============================================================ */
window.onerror = function (msg, src, line, col, err) {
    document.body.insertAdjacentHTML(
        "beforeend",
        `<div style="
            position:fixed;
            bottom:10px; left:10px;
            color:red;
            background:#000;
            padding:8px;
            border:1px solid red;
            z-index:999999999;">
            <b>${msg}</b><br>
            Line: ${line}
        </div>`
    );
};


/* ============================================================
   GLOBAL STATE
============================================================ */
let scrollRAF = false;
let isStreaming = false;
let cancelStream = false;
let ignoreNextResponse = false;


/* ============================================================
   DOM READY
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

    /* ------------------------------------
       ELEMENTS
    ------------------------------------ */
    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const clearBtn = document.getElementById("clearChat");
    const messages = document.getElementById("messages");
    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const modePill = document.getElementById("modePill");


    /* ============================================================
       BACKEND WARM-UP
    ============================================================ */
    if (!window.__leoWarm__) {
        window.__leoWarm__ = true;

        const warm = (x) =>
            fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: x, userId: "warm", name: "warm" })
            }).catch(() => {});

        warm("boot1");
        setTimeout(() => warm("boot2"), 1200);
    }


    /* ============================================================
       USER ID SYSTEM
    ============================================================ */
    function getCookie(name) {
        const m = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
        return m ? m[2] : null;
    }
    function setCookie(name, val) {
        document.cookie = `${name}=${val}; path=/; max-age=31536000`;
    }

    let userId =
        getCookie("leocore-user") ||
        localStorage.getItem("leocore-user");

    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        setCookie("leocore-user", userId);
        localStorage.setItem("leocore-user", userId);
    }


    /* ============================================================
       RESTORE CHAT HISTORY
    ============================================================ */
    const saved = JSON.parse(localStorage.getItem("leocore-chat") || "[]");
    saved.forEach((m) => addMessage(m.text, m.sender));

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
       SAFE SCROLL
    ============================================================ */
    function scrollToBottom() {
        if (scrollRAF) return;
        scrollRAF = true;

        requestAnimationFrame(() => {
            messages.scrollTop = messages.scrollHeight;
            scrollRAF = false;
        });
    }


    /* ============================================================
       HERO AUTO-TYPER
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
        setTimeout(typeAnimation, deleting ? 55 : 75);
    }
    typeAnimation();


    /* ============================================================
       ADD MESSAGE
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
    }


    /* ============================================================
       TYPING INDICATOR
    ============================================================ */
    function createTypingBubble() {
        const hold = document.createElement("div");
        hold.className = "ai-msg typing-holder";

        hold.innerHTML = `
            <div class="spiral-bubble">
                <div class="spiral-core"></div>
                <div class="orbit-wrapper">
                    <div class="o1"></div>
                    <div class="o2"></div>
                    <div class="o3"></div>
                </div>
            </div>
        `;

        messages.appendChild(hold);
        scrollToBottom();
        return hold;
    }


    /* ============================================================
       STREAM AI MESSAGE
    ============================================================ */
    async function streamMessage(full, isFlame = false) {
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
            isFlame ? (5 + Math.random() * 9) : (15 + Math.random() * 18);

        while (i < full.length) {
            if (cancelStream) break;

            span.innerHTML = full.substring(0, i + 1);
            i++;
            scrollToBottom();
            await new Promise((r) => setTimeout(r, speed()));
        }

        cursor.remove();
        isStreaming = false;
        saveChat();
    }


    /* ============================================================
       SEND MESSAGE
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
                    boost: flame ? "🔥 FLAME TONE" : ""
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


    /* SEND BUTTON + ENTER KEY */
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });


    /* ============================================================
       OPEN / CLOSE CHAT
    ============================================================ */
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
        document.body.classList.add("chat-open");

        document.querySelector(".app-wrapper").style.display = "none";

        setTimeout(() => document.body.classList.add("show-blur"), 50);
    });

    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
        document.body.classList.remove("show-blur");

        document.querySelector(".app-wrapper").style.display = "block";

        setTimeout(() => document.body.classList.remove("chat-open"), 280);
    });


    /* ============================================================
       HOLD-TO-WIPE
    ============================================================ */
    let holdTimer = null;
    let holdActive = false;

    clearBtn.addEventListener("pointerdown", () => {
        holdTimer = setTimeout(() => {
            holdActive = true;
            fullWipe();
        }, 850);
    });

    clearBtn.addEventListener("pointerup", () => {
        if (!holdActive) {
            messages.innerHTML = "";
            localStorage.removeItem("leocore-chat");
        }
        holdActive = false;
        clearTimeout(holdTimer);
    });

    function fullWipe() {
        const overlay = document.createElement("div");
        overlay.id = "wipeOverlay";
        overlay.innerHTML = `
            <div class="wipe-container">
                <div class="wipe-loader"></div>
                <div class="wipe-text">Clearing data…</div>
            </div>
        `;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add("show"));

        setTimeout(() => {
            localStorage.clear();
            messages.innerHTML = "";
            chatScreen.classList.remove("active");

            overlay.classList.remove("show");
            setTimeout(() => overlay.remove(), 300);
        }, 1500);
    }


    /* ============================================================
       MODE SYSTEM
    ============================================================ */
    const modeThemes = {
        default: "#00eaff",
        study: "#00aaff",
        research: "#00ffc6",
        reading: "#ffa840",
        deep: "#ff0033",
        chill: "#b400ff",
        precision: "#00eaff",
        flame: "#ff4500"
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
        document.body.classList.toggle("flame-mode", mode === "flame");
    }
    updateModePill();

    document.querySelectorAll(".mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.mode;
            localStorage.setItem("leocore-mode", mode);

            document.querySelectorAll(".mode-btn").forEach((b) =>
                b.classList.remove("active")
            );
            btn.classList.add("active");

            updateModePill();

            chatScreen.classList.add("active");
            document.body.classList.add("chat-open");
            document.querySelector(".app-wrapper").style.display = "none";

            setTimeout(() => document.body.classList.add("show-blur"), 70);
        });
    });


    /* ============================================================
       QUICK TOOLS AUTOFILL
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
            chatScreen.classList.add("active");
        });
    });

}); // END OF DOM


/* ============================================================
   BACKEND KEEP-ALIVE
============================================================ */
setInterval(() => {
    fetch("https://leocore.onrender.com/ping").catch(() => {});
}, 45000);
