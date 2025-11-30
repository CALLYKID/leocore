// ===============================================================
// LEOCORE — CLEAN CHAT SYSTEM
// ===============================================================

window.addEventListener("DOMContentLoaded", () => {

    // ELEMENTS
    const chatScreen = document.getElementById("chatScreen");
    const openChat = document.getElementById("openChat");   // main homepage chat opener
    const fakeInput = document.getElementById("fakeInput"); // fake bar that opens chat
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");

    // OPEN CHAT — homepage chat button
    if (openChat) {
        openChat.addEventListener("click", () => {
            chatScreen.classList.add("active");
        });
    }

    // OPEN CHAT — clicking fake input bar
    fakeInput.addEventListener("click", () => {
        chatScreen.classList.add("active");
    });

    // CLOSE CHAT
    closeChat.addEventListener("click", () => {
        chatScreen.classList.remove("active");
    });

    // ADD MESSAGE TO CHAT
    function addMessage(text, sender) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    // SEND MESSAGE TO BACKEND
    async function sendToGroq(textMessage) {
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: textMessage })
            });

            const raw = await res.text();
            return JSON.parse(raw);

        } catch (err) {
            return { reply: "Network error occurred.", audio: null };
        }
    }

    // USER SENDS MESSAGE
    sendBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) return;

        addMessage(text, "user");
        input.value = "";

        addMessage("Processing…", "ai");

        const data = await sendToGroq(text);

        messages.lastChild.remove(); 
        addMessage(data.reply, "ai");

        if (data.audio) {
            const audio = new Audio("data:audio/mp3;base64," + data.audio);
            audio.play().catch(() => {});
        }
    });

});
