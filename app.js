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
       STOP MODE STATE
    ============================================================ */
    let isStreaming = false;     // AI currently typing?
    let cancelStream = false;    // Used to instantly stop streaming


    /* ============================================================
       🔐 PERMANENT CREATOR ID SYSTEM (PATCHED)
    ============================================================ */
    const CREATOR_ID = "leo-official-001";
    const isCreatorDevice = true;

    function getCookie(name) {
        const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
        return match ? match[2] : null;
    }

    function setCookie(name, value) {
        document.cookie = `${name}=${value}; path=/; max-age=31536000`;
    }

    let userId = getCookie("leocore-user") || localStorage.getItem("leocore-user");

    if (!userId) {
        userId = isCreatorDevice ? CREATOR_ID : "user-" + Math.random().toString(36).slice(2);
        setCookie("leocore-user", userId);
        localStorage.setItem("leocore-user", userId);
    }

    setCookie("leocore-user", userId);
    localStorage.setItem("leocore-user", userId);


    /* ============================================================
       LOAD NAME + CHAT HISTORY
    ============================================================ */
    let savedName = localStorage.getItem("leocore-name") || null;

    let savedChat = JSON.parse(localStorage.getItem("leocore-chat") || "[]");
    savedChat.forEach(msg => addMessage(msg.text, msg.sender));

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
       HERO AUTO-TYPE
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
       MESSAGE RENDERER
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
   STREAMING RESPONSE (STOP-MODE COMPATIBLE)
============================================================ */
async function streamMessage(fullText) {
    isStreaming = true;
    cancelStream = false;

    fullText = fullText.replace(/\n/g, "<br>");

    const wrap = document.createElement("div");
    wrap.className = "ai-msg";

    const bubble = document.createElement("div");
    bubble.className = "bubble ai-streaming";

    const textSpan = document.createElement("span");
    textSpan.className = "stream-text";
    bubble.appendChild(textSpan);

    const cursor = document.createElement("div");
    cursor.className = "neon-cursor";
    bubble.appendChild(cursor);

    wrap.appendChild(bubble);
    messages.appendChild(wrap);

    scrollToBottom();

    let i = 0;

    while (i < fullText.length) {
        if (cancelStream) break; // 🔥 STOP HERE

        textSpan.innerHTML = fullText.substring(0, i + 1);
        scrollToBottom();

        let speed = 11 + Math.random() * 22;
        await new Promise(res => setTimeout(res, speed));

        i++;
    }

    // 🔥 If user pressed STOP → instantly finalize message
    if (cancelStream) {
        textSpan.innerHTML = fullText;
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
   SEND MESSAGE (STOP MODE + DISABLE BUTTON ADDED)
============================================================ */
async function sendMessage() {

    // 🔥 If AI is typing → convert SEND → STOP
    if (isStreaming) {
        cancelStream = true;
        isStreaming = false;

        sendBtn.innerHTML = "➤";  
        sendBtn.classList.remove("stop-mode");
        return;
    }

    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    // Lock input + transform button to STOP MODE
    input.disabled = true;
    sendBtn.innerHTML = "■";        // stop icon
    sendBtn.classList.add("stop-mode");

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
        addMessage("⚠️ Network error. Backend is still waking up.", "ai");
    }

    // Restore SEND button
    sendBtn.innerHTML = "➤";
    sendBtn.classList.remove("stop-mode");
    input.disabled = false;
}
   /* ============================================================
   EVENTS (NOW STOP-MODE AWARE)
============================================================ */
sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
});


/* ============================================================
   KEEPALIVE — 10 minutes
============================================================ */
setInterval(() => {
    fetch("https://leocore.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: "__ping__",
            userId: "system-pinger"
        })
    }).catch(() => {});
}, 600000);



/* ============================================================
   PREMIUM HOLD-TO-RESET SYSTEM (UNCHANGED + PATCHED)
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


    /* — short tap = clear messages only — */
    clearBtn.addEventListener("click", () => {
        if (holdTriggered) return;

        messages.style.opacity = 0;

        setTimeout(() => {
            messages.innerHTML = "";
            localStorage.removeItem("leocore-chat");
            messages.style.opacity = 1;
        }, 200);
    });


    /* — long hold = full wipe (except userId) — */
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

            statusBox.style.opacity = 0;
            setTimeout(() => statusBox.remove(), 400);

            messages.style.opacity = 0;

            setTimeout(() => {

                localStorage.removeItem("leocore-chat");
                localStorage.removeItem("leocore-name");
                // DON’T remove permanent userId anymore
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


    /* — hold event listeners — */
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
   OPEN CHAT + CLOSE CHAT (FADE-IN / FADE-OUT)
============================================================ */
fakeInput.addEventListener("click", () => {

    if (isStreaming) return; // prevent weird open during stream

    chatScreen.classList.add("active");
    chatScreen.style.opacity = "0";

    setTimeout(() => {
        chatScreen.style.transition = "opacity 0.25s ease";
        chatScreen.style.opacity = "1";
    }, 10);
});


closeChat.addEventListener("click", () => {

    if (isStreaming) return; // prevents closing mid-stream

    chatScreen.style.opacity = "0";

    setTimeout(() => {
        chatScreen.classList.remove("active");
    }, 250);
});
   /* ============================================================
   SAFETY: BLOCK TEXT SELECTION, DRAGGING, LONG-PRESS COPY
============================================================ */
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("dragstart", e => e.preventDefault());

document.addEventListener("selectstart", e => {
    // Allow selecting inside chat bubbles only
    if (!e.target.classList.contains("bubble") &&
        !e.target.closest(".bubble")) {
        e.preventDefault();
    }
});


/* ============================================================
   OPTIONAL: AUTO-FOCUS INPUT WHEN CHAT OPENS
============================================================ */
function focusInput() {
    setTimeout(() => {
        input.focus();
    }, 250);
}

fakeInput.addEventListener("click", focusInput);


/* ============================================================
   FIX: ALWAYS SCROLL TO BOTTOM ON RESIZE/ROTATION
============================================================ */
window.addEventListener("resize", scrollToBottom);
window.addEventListener("orientationchange", scrollToBottom);


/* ============================================================
   PATCH: ENSURE NO DUPLICATE STREAMS EVER START
============================================================ */
window.addEventListener("beforeunload", () => {
    // Prevent stuck-stop button or stuck-stream flag
    isStreaming = false;
});


/* ============================================================
   PATCH: FIX LAST-MESSAGE DUPLICATION (RARE BUG)
============================================================ */
let lastSentText = null;

function safeSendText(current) {
    if (current === lastSentText) return false;
    lastSentText = current;
    return true;
}


/* ============================================================
   AUTO-REACTIVATE SEND BUTTON AFTER STREAM
============================================================ */
const observer = new MutationObserver(() => {
    if (!isStreaming) {
        sendBtn.disabled = false;
        sendBtn.classList.remove("stop-mode");
    }
});

observer.observe(messages, { childList: true, subtree: true });


/* ============================================================
   PATCH: PREVENT DOUBLE-ENTER SPAM ON FAST DEVICES
============================================================ */
let enterCooldown = false;

input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        if (enterCooldown) {
            e.preventDefault();
            return;
        }

        enterCooldown = true;
        setTimeout(() => enterCooldown = false, 300);
    }
});


/* ============================================================
   FINAL STARTUP LOG (DEV MODE)
============================================================ */
console.log("%cLeoCore Chat.js Loaded ✓", 
    "color:#00eaff; font-size:16px; font-weight:700;");
