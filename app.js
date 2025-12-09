/* ============================================================
   DEV ERROR POPUP (Debug Only)
============================================================ */
window.onerror = function (msg, src, line) {
    document.body.insertAdjacentHTML(
        "beforeend",
        `<div style="position:fixed;bottom:10px;left:10px;color:red;font-size:14px;background:#000;padding:8px;border:1px solid red;z-index:9999">
            ${msg}<br>Line: ${line}
        </div>`
    );
};


/* GLOBAL STATE */
let scrollRAF = false;
let isStreaming = false;
let cancelStream = false;
let ignoreNextResponse = false;


/* ============================================================
   MAIN APP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

    /* ============================================================
       QUICKSTART PING — instantly wake backend
    ============================================================ */
    (function warmBackend() {
        const url = "https://leocore.onrender.com/api/chat";

        const payload = (msg) => ({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: msg,
                userId: "warmup",
                name: "warmup"
            })
        });

        fetch(url, payload("ping")).catch(() => {});
        setTimeout(() => fetch(url, payload("ping2")).catch(() => {}), 1200);
    })();


    // Force reset on load
    localStorage.setItem("leocore-mode", "default");

    /* ELEMENTS (exact to HTML) */
    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const clearBtn = document.getElementById("clearChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");
    const modePill = document.getElementById("modePill");
    const aiLoader = document.getElementById("aiLoader");

    /* Safety check */
    [
        "chatScreen","closeChat","clearBtn","messages",
        "input","sendBtn","fakeInput","fakeText","modePill"
    ].forEach(id => {
        if (!eval(id)) console.error("❌ Missing element:", id);
    });


    /* ============================================================
       USER ID SYSTEM
    ============================================================ */
    function getCookie(n) {
        const m = document.cookie.match("(^|;) ?" + n + "=([^;]*)(;|$)");
        return m ? m[2] : null;
    }

    function setCookie(n, v) {
        document.cookie = `${n}=${v}; path=/; max-age=31536000`;
    }

    let userId = getCookie("leocore-user")
        || localStorage.getItem("leocore-user");

    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        setCookie("leocore-user", userId);
        localStorage.setItem("leocore-user", userId);
    }


    /* ============================================================
       CHAT SAVE / LOAD
    ============================================================ */
    function saveChat() {
        const arr = [];
        document.querySelectorAll(".bubble").forEach(b => {
            arr.push({
                text: b.innerHTML,
                sender: b.parentElement.classList.contains("user-msg")
                    ? "user"
                    : "ai"
            });
        });
        localStorage.setItem("leocore-chat", JSON.stringify(arr));
    }

    JSON.parse(localStorage.getItem("leocore-chat") || "[]")
        .forEach(m => addMessage(m.text, m.sender));


    /* ============================================================
       SMOOTH SCROLL
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
       HERO AUTO TYPER
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

        setTimeout(typeAnimation, deleting ? 50 : 70);
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
       ** FIXED HOLO-REACTOR LOADER **
       (Matches your CSS — orbit-wrapper + o1/o2/o3)
    ============================================================ */
    function createTypingBubble() {
        const holder = document.createElement("div");
        holder.className = "ai-msg typing-holder";

        holder.innerHTML = `
            <div class="spiral-bubble">
                <div class="spiral-core"></div>

                <div class="orbit-wrapper">
                    <div class="o1"></div>
                    <div class="o2"></div>
                    <div class="o3"></div>
                </div>
            </div>
        `;

        messages.appendChild(holder);
        scrollToBottom();
        return holder;
    }


    /* ============================================================
       STREAMING ENGINE
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
        span.className = "stream-text";

        const cursor = document.createElement("div");
        cursor.className = "neon-cursor";

        bubble.appendChild(span);
        bubble.appendChild(cursor);
        wrap.appendChild(bubble);
        messages.appendChild(wrap);

        scrollToBottom();

        let i = 0;
        const speed = () =>
            isFlame ? (5 + Math.random() * 10)
                    : (15 + Math.random() * 15);

        while (i < full.length) {
            if (cancelStream) break;

            span.innerHTML = full.substring(0, i + 1);
            i++;

            scrollToBottom();
            await new Promise(r => setTimeout(r, speed()));
        }

        cursor.classList.add("fade-out");
        setTimeout(() => cursor.remove(), 150);

        saveChat();
        isStreaming = false;
    }
   /* ============================================================
   SEND MESSAGE
============================================================ */
async function sendMessage() {
    if (!input || !sendBtn) return;

    // Stop streaming
    if (isStreaming) {
        cancelStream = true;
        ignoreNextResponse = true;
        return;
    }

    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    input.disabled = true;
    sendBtn.classList.add("stop-mode");
    sendBtn.innerHTML = "■";

    const typing = createTypingBubble();

    const mode = localStorage.getItem("leocore-mode") || "default";
    const isFlame = mode === "flame";

    try {
        const res = await fetch("https://leocore.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                userId,
                mode,
                boost: isFlame ? "🔥 FLAME TONE" : ""
            })
        });

        const data = await res.json();
        typing.remove();

        if (!ignoreNextResponse) {
            await streamMessage(data.reply, isFlame);
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


/* ============================================================
   SAFE EVENT HOOKS
============================================================ */
sendBtn?.addEventListener("click", sendMessage);

input?.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
});


/* ============================================================
   CHAT OPEN / CLOSE — Smooth FX
============================================================ */
if (fakeInput) {
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
        document.body.classList.add("chat-open");

        setTimeout(() => {
            document.body.classList.add("show-blur");
            input?.focus();
        }, 30);
    });
}

if (closeChat) {
    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
        document.body.classList.remove("show-blur");

        setTimeout(() => {
            document.body.classList.remove("chat-open");
        }, 300);
    });
}


/* ============================================================
   DELETE SYSTEM — HOLD TO WIPE
============================================================ */
let holdTimer = null;
let holdActive = false;

function clearChatInstant() {
    messages.innerHTML = "";
    localStorage.removeItem("leocore-chat");
    saveChat();
}

function fullWipeAnimation() {
    const overlay = document.createElement("div");
    overlay.id = "wipeOverlay";
    overlay.innerHTML = `
        <div class="wipe-container">
            <div class="wipe-loader"></div>
            <div class="wipe-text">Clearing data...</div>
        </div>
    `;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add("show"));

    setTimeout(() => {
        localStorage.clear();
        messages.innerHTML = "";
        saveChat();

        chatScreen.classList.remove("active");

        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 400);
    }, 1500);
}

function startHold() {
    if (holdTimer) return;
    holdActive = false;
    holdTimer = setTimeout(() => {
        holdActive = true;
        fullWipeAnimation();
    }, 850);
}

function cancelHold() {
    if (!holdTimer) return;
    clearTimeout(holdTimer);

    if (!holdActive) clearChatInstant();

    holdTimer = null;
}

clearBtn?.addEventListener("mousedown", startHold);
clearBtn?.addEventListener("touchstart", startHold);
clearBtn?.addEventListener("mouseup", cancelHold);
clearBtn?.addEventListener("mouseleave", cancelHold);
clearBtn?.addEventListener("touchend", cancelHold);


/* ============================================================
   MODE SYSTEM — FIXED + SYNCHED TO CSS
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

    modePill.textContent = labels[mode] || mode.toUpperCase();

    document.documentElement.style.setProperty("--theme-glow", modeThemes[mode]);
    document.body.classList.toggle("flame-mode", mode === "flame");
}

updateModePill();

// Clicking the pill scrolls home
modePill?.addEventListener("click", () => {
    chatScreen.classList.remove("active");
    document.body.classList.remove("show-blur");
    document.body.classList.remove("chat-open");

    window.scrollTo({ top: 0, behavior: "smooth" });
});

/* Apply Mode */
document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;

        localStorage.setItem("leocore-mode", mode);
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        updateModePill();

        // Smooth open to chat
        chatScreen.classList.add("active");
        document.body.classList.add("chat-open");

        setTimeout(() => {
            document.body.classList.add("show-blur");
            input?.focus();
        }, 60);
    });
});


/* ============================================================
   QUICK TOOLS
============================================================ */
const toolPrompts = {
    summarise: "Summarise this text:",
    plan: "Plan my day:",
    study: "Explain this homework:",
    notes: "Generate notes about:"
};

document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        input.value = toolPrompts[btn.dataset.task] || "";
        chatScreen.classList.add("active");

        setTimeout(() => input?.focus(), 120);
    });
});


}); // END DOM READY



/* ============================================================
   PARALLAX FIX — KEEP ORIGINAL SCALE
============================================================ */
let pRaf = false;

document.addEventListener("mousemove", e => {
    if (pRaf) return;
    pRaf = true;

    requestAnimationFrame(() => {
        const x = (e.clientX / innerWidth - 0.5) * 12;
        const y = (e.clientY / innerHeight - 0.5) * 12;

        document.querySelectorAll("#bgVideo, .orb").forEach(el => {
    el.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
});

        pRaf = false;
    });
});


/* ============================================================
   BACKEND KEEP-ALIVE
============================================================ */
setInterval(() => {
    fetch("https://leocore.onrender.com/ping")
        .catch(() => {});
}, 45000);
