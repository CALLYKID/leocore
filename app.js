// ORB EFFECTS — FINAL FIXED VERSION
const orb = document.getElementById("orb");
const shock = document.getElementById("shockwave");

orb.addEventListener("click", () => {
    // Pop animation
    orb.style.transition = "0.25s ease";
    orb.style.transform = "scale(1.12)";
    setTimeout(() => orb.style.transform = "scale(1)", 250);

    // Reset shockwave instantly
    shock.style.transition = "none";
    shock.style.transform = "translate(-50%, -50%) scale(0)";
    shock.style.opacity = "0";

    // Animate shockwave outward
    requestAnimationFrame(() => {
        shock.style.transition = "0.45s ease-out";
        shock.style.transform = "translate(-50%, -50%) scale(5)";
        shock.style.opacity = "0.7";
    });

    // Fade out
    setTimeout(() => {
        shock.style.opacity = "0";
    }, 350);

    console.log("ORB CLICKED ✔️");
});


// ------------------------------------------------------
// CHAT SYSTEM
// ------------------------------------------------------
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


// ------------------------------------------------------
// SEND FUNCTION TO BACKEND (TEXT + AUDIO)
// ------------------------------------------------------
async function sendToGroq(prompt) {
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt })
        });

        return await res.json();
    } catch (err) {
        return { reply: "AI error: " + err.message };
    }
}


// ------------------------------------------------------
// SEND MESSAGE
// ------------------------------------------------------
sendBtn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    addMessage("Processing...", "ai");

    const data = await sendToGroq(text);

    messages.lastChild.remove();
    addMessage(data.reply, "ai");

    // AUDIO 🔊
    if (data.audio) {
        const audio = new Audio("data:audio/mp3;base64," + data.audio);
        audio.play().catch(() => console.log("Audio failed to play."));
    }
});
