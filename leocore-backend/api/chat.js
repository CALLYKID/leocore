/* ============================================================
   ERROR POPUP (DEV MODE)
============================================================ */
window.onerror = function (msg, src, line) {
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

    let isStreaming = false;
    let stopStream = false;


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
        document.querySelectorAll(".bubble").forEach(b => {
            arr.push({
                text: b.innerHTML,
                sender: b.parentElement.classList.contains("user-msg") ? "user" : "ai"
            });
        });
        localStorage.setItem("leocore-chat", JSON.stringify(arr));
    }


    /* ============================================================
   SAFE AUTO SCROLL (CANNOT RUN BEFORE INITIALIZATION)
============================================================ */
let scrollRAF;

function scrollToBottom() {
    if (scrollRAF === undefined) scrollRAF = false; // safe init

    if (scrollRAF) return;
    scrollRAF = true;

    requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
        scrollRAF = false;
    });
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

        const b = document.createElement("div");
        b.className = "bubble";
        b.innerHTML = text;

        wrap.appendChild(b);
        messages.appendChild(wrap);

        scrollToBottom();
        saveChat();
    }


    /* ============================================================
       TYPING ANIMATION BUBBLE
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
       AI STREAMING
============================================================ */
    async function streamMessage(fullText) {
        fullText = fullText.replace(/\n/g, "<br>");
        isStreaming = true;
        stopStream = false;

        sendBtn.classList.add("stop-mode");
        sendBtn.innerHTML = "";
        input.disabled = true;

        const wrap = document.createElement("div");
        wrap.className = "ai-msg";

        const bubble = document.createElement("div");
        bubble.className = "bubble ai-streaming";

        const textSpan = document.createElement("span");
        textSpan.className = "stream-text";

        bubble.appendChild(textSpan);
        wrap.appendChild(bubble);
        messages.appendChild(wrap);
        scrollToBottom();

        let i = 0;

        while (i < fullText.length) {
            if (stopStream) break;

            textSpan.innerHTML = fullText.substring(0, i + 1);
            scrollToBottom();

            await new Promise(res => setTimeout(res, 10 + Math.random() * 18));
            i++;
        }

        sendBtn.classList.remove("stop-mode");
        sendBtn.innerHTML = "➤";
        input.disabled = false;
        isStreaming = false;

        saveChat();
    }


    /* ============================================================
       SEND MESSAGE (FIXED: MODE ADDED)
============================================================ */
    async function sendMessage() {

        if (isStreaming) {
            stopStream = true;
            return;
        }

        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        const typingBubble = createTypingBubble();

        try {
            const res = await fetch("https://leocore.onrender.com/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    userId,
                    name: savedName,
                    mode: localStorage.getItem("leocore-mode") || "default"
                })
            });

            const data = await res.json();
            typingBubble.remove();

            await streamMessage(data.reply);

        } catch (err) {
            typingBubble.remove();
            addMessage("⚠️ Network error.", "ai");
        }
    }


    /* ============================================================
       EVENTS
============================================================ */
    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("keydown", e => {
        if (e.key === "Enter" && !isStreaming) sendMessage();
    });


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
