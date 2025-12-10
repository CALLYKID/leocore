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
   1. DEV ERROR POPUP  (Hybrid mode)
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
            z-index:999999999;">
            <b>${msg}</b><br>Line: ${line}
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

    /* ELEMENTS — matches your HTML exactly */
    const chatScreen  = document.getElementById("chatScreen");
    const closeChat   = document.getElementById("closeChat");
    const clearBtn    = document.getElementById("clearChat");
    const messages    = document.getElementById("messages");
    const fakeInput   = document.getElementById("fakeInput");
    const fakeText    = document.getElementById("fakeText");
    const input       = document.getElementById("userInput");
    const sendBtn     = document.getElementById("sendBtn");
    const modePill    = document.getElementById("modePill");
    const blurBuffer  = document.getElementById("chatBlurBuffer");


    /* ============================================================
       BACKEND WARM-UP — speeds first response massively
    ============================================================ */
    if (!window.__leoWarm__) {
        window.__leoWarm__ = true;

        const warm = (msg) =>
            fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, userId: "warm", name: "warm" })
            }).catch(() => {});

        warm("boot1");
        setTimeout(() => warm("boot2"), 900);
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
       RESTORE CHAT HISTORY (fully matches CSS & HTML)
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
   2. HERO AUTO-TYPER  (Matches your fakeInput + fakeText)
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

    setTimeout(typeAnimation, deleting ? 55 : 70);
}
typeAnimation();


/* ============================================================
   3. OPEN / CLOSE CHAT  (Perfect match to CSS & HTML)
============================================================ */
fakeInput.addEventListener("click", () => {
    blurBuffer.style.opacity = "1";     // fade-in blur
    chatScreen.classList.add("active"); // slide up chat
    document.querySelector(".app-wrapper").style.display = "none";
});

closeChat.addEventListener("click", () => {
    blurBuffer.style.opacity = "0";     // remove blur
    chatScreen.classList.remove("active");
    document.querySelector(".app-wrapper").style.display = "block";
});


/* ============================================================
   4. MODE SYSTEM (color theme + pill + active state)
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

// apply theme on page load
updateModePill();

document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        localStorage.setItem("leocore-mode", mode);

        // highlight selected
        document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        updateModePill();

        // instantly open chat after selecting mode
        blurBuffer.style.opacity = "1";
        chatScreen.classList.add("active");
        document.querySelector(".app-wrapper").style.display = "none";
    });
});
   /* ============================================================
   5. ADD MESSAGE TO CHAT
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
   6. HYPERNOVA TYPING INDICATOR
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
   7. STREAM AI MESSAGE
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
   8. SEND MESSAGE
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

        if (!ignoreNextResponse) await streamMessage(data.reply, flame);
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
input.addEventListener("keydown", (e) => e.key === "Enter" && sendMessage());

   /* ============================================================
   9. OPEN / CLOSE CHAT
============================================================ */
fakeInput.addEventListener("click", () => {
    blurBuffer.style.opacity = "1";
    chatScreen.classList.add("active");
    document.querySelector(".app-wrapper").style.display = "none";
});

closeChat.addEventListener("click", () => {
    blurBuffer.style.opacity = "0";
    chatScreen.classList.remove("active");
    document.querySelector(".app-wrapper").style.display = "block";
});


/* ============================================================
   10. HOLD-TO-WIPE SYSTEM
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
   11. MODE SYSTEM
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

        blurBuffer.style.opacity = "1";
        chatScreen.classList.add("active");
        document.querySelector(".app-wrapper").style.display = "none";
    });
});


/* ============================================================
   12. QUICK TOOLS AUTOFILL
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
        blurBuffer.style.opacity = "1";
        chatScreen.classList.add("active");
        document.querySelector(".app-wrapper").style.display = "none";
    });
});


/* ============================================================
   13. BACKEND KEEP-ALIVE (Render sleep fix)
============================================================ */
setInterval(() => {
    fetch("https://leocore.onrender.com/ping").catch(() => {});
}, 45000);


/* ============================================================
   14. VIDEO-LOAD BACKGROUND PATCH 
============================================================ */
const bgVideo = document.getElementById("bgVideo");

if (bgVideo) {
    bgVideo.addEventListener("loadeddata", () => {
        // once the actual video frame is ready, unlock transitions
        bgVideo.style.opacity = "1";
    });
}

// prevent black flash on Android video first-frame
document.addEventListener("DOMContentLoaded", () => {
    if (bgVideo) {
        bgVideo.style.opacity = "0";
        setTimeout(() => {
            bgVideo.style.transition = "opacity .45s ease";
        }, 50);
    }
});
   
