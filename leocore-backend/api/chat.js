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

    let startupShown = false;


    /* ============================================================
       USER ID + LOCAL MEMORY
    ============================================================*/
    let userId = localStorage.getItem("leocore-user");
    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        localStorage.setItem("leocore-user", userId);
    }

    let savedName = localStorage.getItem("leocore-name") || null;

    let savedChat = JSON.parse(localStorage.getItem("leocore-chat") || "[]");
    savedChat.forEach(msg => addMessage(msg.text, msg.sender));



    /* ============================================================
       SAVE CHAT
    ============================================================*/
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
       HERO PLACEHOLDER ANIMATION
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
       OPEN CHAT — SHOW STARTUP LINE
    ============================================================*/
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");

        if (!startupShown) {
            startupShown = true;

            setTimeout(() => {
                addMessage("⚡ Booting LeoCore engine…", "ai");
            }, 350);
        }
    });

    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
    });



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

    function addTypingBubble() {
        const wrap = document.createElement("div");
        wrap.className = "typing-bubble";
        wrap.innerHTML = `
            <span class='dot d1'></span>
            <span class='dot d2'></span>
            <span class='dot d3'></span>
        `;
        messages.appendChild(wrap);
        scrollToBottom();
        return wrap;
    }



    /* ============================================================
       SAFE SEND MESSAGE FUNCTION
       (Prevents creator hijack attempts)
    ============================================================*/
    async function sendMessage() {
        let text = input.value.trim();
        if (!text) return;

        const lower = text.toLowerCase();

        // Block people trying to pretend they are "Leo"
        if (
            lower.includes("i made you") ||
            lower.includes("i built you") ||
            lower.includes("i created you") ||
            (lower.includes("my name is leo")) ||
            (lower.includes("i am leo") && !lower.includes("not"))
        ) {
            text += " (note: user is NOT the creator)";
        }

        addMessage(text, "user");
        input.value = "";

        const loader = addTypingBubble();
        const start = performance.now();

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

            // Minimum response delay (smooth UX)
            const minTime = 450;
            const elapsed = performance.now() - start;
            if (elapsed < minTime) {
                await new Promise(res => setTimeout(res, minTime - elapsed));
            }

            loader.remove();
            addMessage(data.reply || "No response received.", "ai");

            if (data.newName) {
                savedName = data.newName;
                localStorage.setItem("leocore-name", savedName);
            }

        } catch (err) {
            loader.remove();
            addMessage("Network error.", "ai");
        }
    }


    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });



    /* ============================================================
       CLEAR CHAT + HOLD TO WIPE ALL DATA
    ============================================================*/
    if (clearBtn) {

        let holdTimer = null;
        let holdActive = false;

        // TAP → CLEAR CHAT ONLY
        clearBtn.addEventListener("click", () => {
            if (holdActive) return;

            messages.classList.add("chat-fade-out");

            setTimeout(() => {
                messages.innerHTML = "";
                localStorage.removeItem("leocore-chat");
                messages.classList.remove("chat-fade-out");
            }, 350);
        });

        // HOLD → WIPE EVERYTHING
        function startHold(e) {
            e.preventDefault();
            holdActive = false;

            holdTimer = setTimeout(() => {
                holdActive = true;

                const flash = document.createElement("div");
                flash.className = "full-wipe-flash";
                document.body.appendChild(flash);

                setTimeout(() => {
                    localStorage.removeItem("leocore-chat");
                    localStorage.removeItem("leocore-name");
                    localStorage.removeItem("leocore-user");
                    location.reload();
                }, 350);

            }, 3000);
        }

        function cancelHold(e) {
            e.preventDefault();
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
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
