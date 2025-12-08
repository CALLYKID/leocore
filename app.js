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

    /* ELEMENTS (UPDATED TO MATCH YOUR HTML) */
    const chatScreen = document.getElementById("chatScreen");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");
    const modePill = document.getElementById("modePill");
   const closeChat = document.getElementById("closeChat");
const clearBtn  = document.getElementById("clearChat");

    /* ============================================================
       USER ID SYSTEM
    ============================================================ */
    function getCookie(name) {
        const v = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
        return v ? v[2] : null;
    }

    function setCookie(name, value) {
        document.cookie = `${name}=${value}; path=/; max-age=31536000`;
    }

    let userId = getCookie("leocore-user") || localStorage.getItem("leocore-user");
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
                sender: b.parentElement.classList.contains("user-msg") ? "user" : "ai"
            });
        });
        localStorage.setItem("leocore-chat", JSON.stringify(arr));
    }

    JSON.parse(localStorage.getItem("leocore-chat") || "[]")
        .forEach(m => addMessage(m.text, m.sender));


    /* ============================================================
       SCROLL
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
        const speed = () => isFlame ? (6 + Math.random() * 9) : (14 + Math.random() * 18);

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

        const loader = createTypingBubble();

        const mode = localStorage.getItem("leocore-mode") || "default";
        const isFlameMode = mode === "flame";

        try {
            const res = await fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    userId,
                    mode,
                    boost: isFlameMode ? "🔥 FLAME TONE" : ""
                })
            });

            const data = await res.json();
            loader.remove();

            if (!ignoreNextResponse) {
                await streamMessage(data.reply, isFlameMode);
            }
            ignoreNextResponse = false;

        } catch {
            loader.remove();
            addMessage("⚠️ Network issue. Try again.", "ai");
        }

        input.disabled = false;
        sendBtn.classList.remove("stop-mode");
        sendBtn.innerHTML = "➤";
    }


    /* BUTTON EVENTS */
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });

    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
        setTimeout(() => input.focus(), 150);
    });

    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
    });


    /* ============================================================
   DELETE SYSTEM — TAP = CLEAR CHAT, HOLD = FULL WIPE
============================================================ */

let holdTimer = null;
let holdActive = false;

/* === TAP DELETE — Only wipe chat === */
function clearChatInstant() {
    messages.innerHTML = "";        // wipe messages
    localStorage.removeItem("leocore-chat"); 
    saveChat();  // save empty chat state so nothing comes back
}

/* === HOLD DELETE — Full data wipe + animation === */
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

    // Fade in
    requestAnimationFrame(() => overlay.classList.add("show"));

    setTimeout(() => {
        // REAL DATA WIPE
        localStorage.clear();
        messages.innerHTML = "";
        saveChat();

        // Close chat
        chatScreen.classList.remove("active");

        // Fade out
        overlay.classList.remove("show");
        setTimeout(() => overlay.remove(), 500);

    }, 1700);
}

/* === HOLD LOGIC CONTROLLER === */
function startHold() {
    if (holdTimer) return;

    holdActive = false;

    // If held for 1 second → full wipe
    holdTimer = setTimeout(() => {
        holdActive = true;
        fullWipeAnimation();
    }, 1000);
}

function cancelHold() {
    if (!holdTimer) return;

    clearTimeout(holdTimer);

    // Short tap → only clear chat
    if (!holdActive) clearChatInstant();

    holdTimer = null;
}

/* === EVENT LISTENERS === */
clearBtn.addEventListener("mousedown", startHold);
clearBtn.addEventListener("touchstart", startHold);

clearBtn.addEventListener("mouseup", cancelHold);
clearBtn.addEventListener("mouseleave", cancelHold);
clearBtn.addEventListener("touchend", cancelHold);

    /* ============================================================
       MODE SYSTEM
    ============================================================ */
    const modeThemes = {
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

        modePill.textContent = mode.toUpperCase();
        document.documentElement.style.setProperty("--theme-glow", modeThemes[mode] || "#00eaff");

        if (mode === "flame") {
            modePill.classList.add("flame-active");
            document.body.classList.add("flame-glow");
        } else {
            modePill.classList.remove("flame-active");
            document.body.classList.remove("flame-glow");
        }
    }
    updateModePill();

    modePill.addEventListener("click", () => {
        chatScreen.classList.remove("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.dataset.mode;
            localStorage.setItem("leocore-mode", mode);

            document.querySelectorAll(".mode-btn")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            updateModePill();
            chatScreen.classList.add("active");
            setTimeout(() => input.focus(), 150);
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
            setTimeout(() => input.focus(), 150);
        });
    });

}); // END DOM READY



/* ============================================================
   PARALLAX
============================================================ */
let pRaf = false;

document.addEventListener("mousemove", (e) => {
    if (pRaf) return;
    pRaf = true;

    requestAnimationFrame(() => {
        const x = (e.clientX / innerWidth - 0.5) * 10;
        const y = (e.clientY / innerHeight - 0.5) * 10;

        document.querySelectorAll(".parallax").forEach(el => {
            el.style.transform = `translate(${x}px, ${y}px)`;
        });

        pRaf = false;
    });
});
