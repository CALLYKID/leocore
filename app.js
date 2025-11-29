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

// SEND FUNCTION
async function sendToGroq(prompt) {
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt })
        });

        const data = await res.json();

        if (!data.reply) return "AI error: No response";
        return data.reply;

    } catch (err) {
        return "AI error: " + err.message;
    }
}

sendBtn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    addMessage("Processing...", "ai");

    const reply = await sendToGroq(text);

    messages.lastChild.remove(); // remove "Processing"
    addMessage(reply, "ai");
});