// ORB EFFECTS
const orb = document.getElementById("orb");
const centerWrapper = document.querySelector(".center-wrapper");

orb.addEventListener("click", () => {
    orb.style.transform = "scale(1.12)";
    setTimeout(() => {
        orb.style.transform = "";
    }, 300);
});

// CHAT SYSTEM
const chatScreen = document.getElementById("chatScreen");
const openChat = document.getElementById("openChat");
const closeChat = document.getElementById("closeChat");
const messages = document.getElementById("messages");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

openChat.addEventListener("click", () => {
    chatScreen.classList.add("active");
});

closeChat.addEventListener("click", () => {
    chatScreen.classList.remove("active");
});

// Add message bubble
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-msg" : "ai-msg";
    div.innerText = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// SEND FUNCTION TO BACKEND
async function sendToGroq(prompt) {
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt })
        });

        return await res.json(); // MUST return full JSON for audio + text
    } catch (err) {
        return { reply: "AI error: " + err.message };
    }
}

sendBtn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    addMessage("Processing...", "ai");

    const data = await sendToGroq(text);

    messages.lastChild.remove();
    addMessage(data.reply, "ai");

    // AUDIO
    if (data.audio) {
        const audio = new Audio("data:audio/mp3;base64," + data.audio);
        audio.play().catch(() => {});
    }
});
orb.addEventListener("click", () => {
    alert("ORB CLICKED!");
});
