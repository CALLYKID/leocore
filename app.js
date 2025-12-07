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
       USER ID + LOCAL MEMORY
       (Backend handles ALL logic, frontend only stores userId)
    ============================================================*/
    let userId = localStorage.getItem("leocore-user");
    if (!userId) {
        userId = "user-" + Math.random().toString(36).slice(2);
        localStorage.setItem("leocore-user", userId);
    }

    let savedName = localStorage.getItem("leocore-name") || null;

    // Restore chat history
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
       AUTO-TYPING HERO PLACEHOLDER
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
       OPEN / CLOSE CHAT
    ============================================================*/
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
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
       SEND MESSAGE — FULLY BACKEND CONTROLLED
    ============================================================*/
    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

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

            // Smooth UX delay
            const minTime = 500;
            const elapsed = performance.now() - start;
            if (elapsed < minTime) {
                await new Promise(r => setTimeout(r, minTime - elapsed));
            }

            loader.remove();

            addMessage(data.reply || "No response received.", "ai");

            if (data.newName) {
                savedName = data.newName;
                localStorage.setItem("leocore-name", savedName);
            }

        } catch (err) {
            loader.remove();
            addMessage("⚠️ Network error.", "ai");
        }
    }


    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", e => {
        if (e.key === "Enter") sendMessage();
    });



    /* ============================================================
       CLEAR BUTTON — TAP = CLEAR CHAT, HOLD 3s = WIPE EVERYTHING
    ============================================================*/
    if (clearBtn) {

        let holdTimer = null;
        let holdTriggered = false;

        // TAP = clear chat only
        clearBtn.addEventListener("click", () => {
            if (holdTriggered) return;

            messages.classList.add("chat-fade-out");

            setTimeout(() => {
                messages.innerHTML = "";
                localStorage.removeItem("leocore-chat");
                messages.classList.remove("chat-fade-out");
            }, 350);
        });

        // HOLD start
        clearBtn.addEventListener("mousedown", startHold);
        clearBtn.addEventListener("touchstart", startHold);

        // HOLD cancel
        clearBtn.addEventListener("mouseup", cancelHold);
        clearBtn.addEventListener("mouseleave", cancelHold);
        clearBtn.addEventListener("touchend", cancelHold);
        clearBtn.addEventListener("touchcancel", cancelHold);

        function startHold(e) {
            holdTriggered = false;

            holdTimer = setTimeout(() => {
                holdTriggered = true;

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

        function cancelHold() {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
        }
    }

});
