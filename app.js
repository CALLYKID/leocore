/* ============================================================
   DEV ERROR POPUP
============================================================ */
window.onerror = function (msg, src, line) {
    document.body.insertAdjacentHTML(
        "beforeend",
        `<div style="position:fixed;bottom:10px;left:10px;color:red;background:#000;padding:8px;border:1px solid red;z-index:999999">
            ${msg}<br>Line: ${line}
        </div>`
    );
};


/* GLOBAL STATE */
let isStreaming = false;
let cancelStream = false;
let ignoreNextResponse = false;
let scrollRAF = false;


/* ============================================================
   MAIN APP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {

    /* ELEMENTS */
    const chatScreen = document.getElementById("chatScreen");
    const closeChat = document.getElementById("closeChat");
    const clearBtn = document.getElementById("clearChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const fakeInput = document.getElementById("fakeInput");
    const fakeText = document.getElementById("fakeText");
    const modePill = document.getElementById("modePill");


    /* ============================================================
       BACKEND WARMUP (SAFE)
    ============================================================ */
    (async function warm() {
        try { await fetch("https://leocore.onrender.com/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "warm", userId: "warm" })
        }); } catch {}
    })();


    /* ============================================================
       USER ID
    ============================================================ */
    function getCookie(name) {
        const m = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
        return m ? m[2] : null;
    }

    function setCookie(name, value) {
        document.cookie = `${name}=${value}; max-age=31536000; path=/`;
    }

    let userId = getCookie("leocore-user") || localStorage.getItem("leocore-user");

    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        setCookie("leocore-user", userId);
        localStorage.setItem("leocore-user", userId);
    }


    /* ============================================================
       SAVE & RESTORE CHAT
    ============================================================ */
    function saveChat() {
        const arr = [];
        document.querySelectorAll(".bubble").forEach(b => {
            const parent = b.closest(".user-msg, .ai-msg");
            arr.push({
                sender: parent.classList.contains("user-msg") ? "user" : "ai",
                text: b.innerHTML
            });
        });
        localStorage.setItem("leocore-chat", JSON.stringify(arr));
    }

    function restoreChat() {
        const data = JSON.parse(localStorage.getItem("leocore-chat") || "[]");
        data.forEach(m => addMessage(m.text, m.sender));
    }

    restoreChat();


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
       HERO TYPER
    ============================================================ */
    const prompts = ["Message LeoCore…", "Give me a task.", "Help me revise.", "Make me a plan.", "Let's work."];

    let pi = 0, ci = 0, deleting = false;

    function typeAnimation() {
        const t = prompts[pi];

        if (!deleting) {
            fakeText.textContent = t.substring(0, ci++);
            if (ci > t.length) {
                deleting = true;
                return setTimeout(typeAnimation, 900);
            }
        } else {
            fakeText.textContent = t.substring(0, ci--);
            if (ci < 0) {
                deleting = false;
                pi = (pi + 1) % prompts.length;
            }
        }

        setTimeout(typeAnimation, deleting ? 45 : 70);
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
       LOADING BUBBLE
    ============================================================ */
    function createTypingBubble() {
        const holder = document.createElement("div");
        holder.className = "ai-msg typing-holder";

        holder.innerHTML = `
            <div class="bubble">...</div>
        `;

        messages.appendChild(holder);
        scrollToBottom();
        return holder;
    }


    /* ============================================================
       STREAM RESPONSE
    ============================================================ */
    async function streamMessage(full, isFlame = false) {
        isStreaming = true;
        cancelStream = false;

        full = full.replace(/\n/g, "<br>");

        const wrap = document.createElement("div");
        wrap.className = "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble";

        const span = document.createElement("span");
        span.className = "stream-text";

        const cursor = document.createElement("span");
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
            await new Promise(r => setTimeout(r, isFlame ? 5 : 18));
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

            if (!ignoreNextResponse) await streamMessage(data.reply, isFlame);
            ignoreNextResponse = false;

        } catch {
            typing.remove();
            addMessage("⚠️ Network issue.", "ai");
        }

        input.disabled = false;
        sendBtn.classList.remove("stop-mode");
        sendBtn.innerHTML = "➤";
    }


    /* EVENTS */
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });


    /* CHAT OPEN/CLOSE */
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
        document.body.classList.add("chat-open");

        setTimeout(() => input.focus(), 80);
    });

    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
        document.body.classList.remove("chat-open");
    });


    /* ============================================================
       CLEAR CHAT
============================================================ */
    clearBtn.addEventListener("click", () => {
        localStorage.removeItem("leocore-chat");
        messages.innerHTML = "";
    });


    /* ============================================================
       MODE SYSTEM
============================================================ */
    const modeThemes = {
        default: "#9d4bff",
        study: "#00aaff",
        research: "#00ffc6",
        reading: "#ffa840",
        deep: "#ff0033",
        chill: "#b400ff",
        precision: "#00eaff",
        flame: "#ff4500"
    };

    function updateMode() {
        const mode = localStorage.getItem("leocore-mode") || "default";
        modePill.textContent = mode.toUpperCase().slice(0,4);
        document.documentElement.style.setProperty("--theme-glow", modeThemes[mode]);
    }

    updateMode();

    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            localStorage.setItem("leocore-mode", btn.dataset.mode);
            updateMode();
            chatScreen.classList.add("active");
            setTimeout(() => input.focus(), 100);
        });
    });


});
