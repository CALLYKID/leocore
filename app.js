// ===============================
// ORB EFFECTS + VOICE INPUT
// ===============================

const orb = document.getElementById("orb");
const centerWrapper = document.querySelector(".center-wrapper");

// ORB CLICK → animation + start voice input
orb.addEventListener("click", () => {
    // Pop animation
    orb.style.transform = "scale(1.12)";
    setTimeout(() => orb.style.transform = "", 250);

    // Shockwave
    const shock = document.getElementById("shockwave");
    shock.style.transition = "none";
    shock.style.transform = "translate(-50%, -50%) scale(0)";
    shock.style.opacity = "0";

    requestAnimationFrame(() => {
        shock.style.transition = "0.35s ease-out";
        shock.style.transform = "translate(-50%, -50%) scale(5)";
        shock.style.opacity = "0.8";
    });

    setTimeout(() => {
        shock.style.opacity = "0";
    }, 350);

    // Start recording
    startVoiceInput();
});

// ===============================
// CHAT SYSTEM
// ===============================

const chatScreen = document.getElementById("chatScreen");
const openChat = document.getElementById("openChat");
const closeChat = document.getElementById("closeChat");
const messages = document.getElementById("messages");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// open / close chat
openChat.addEventListener("click", () => {
    chatScreen.classList.add("active");
});
closeChat.addEventListener("click", () => {
    chatScreen.classList.remove("active");
});

// add text bubble
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-msg" : "ai-msg";
    div.innerText = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// ===============================
// SEND TO AI (TEXT OR AUDIO)
// ===============================

async function sendToAI(bodyData) {
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData)
        });

        return await res.json();
    } catch (err) {
        return { reply: "AI error: " + err.message };
    }
}

// ===============================
// TEXT SEND BUTTON
// ===============================

sendBtn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    addMessage("Processing…", "ai");

    const data = await sendToAI({ message: text });

    messages.lastChild.remove();
    addMessage(data.reply, "ai");

    if (data.audio) {
        new Audio("data:audio/mp3;base64," + data.audio).play();
    }
});

// ===============================
// VOICE INPUT SYSTEM
// ===============================

// Convert Blob → Base64
function blobToBase64(blob) {
    return new Promise(res => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            res(base64);
        };
        reader.readAsDataURL(blob);
    });
}

// Start recording
async function startVoiceInput() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const recorder = new MediaRecorder(stream);
        let chunks = [];

        recorder.ondataavailable = e => chunks.push(e.data);

        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            const base64 = await blobToBase64(blob);

            addMessage("🎤 Listening…", "user");

            const data = await sendToAI({ audio: base64 });

            // Replace placeholder
            messages.lastChild.remove();
            addMessage(data.reply, "ai");

            if (data.audio) {
                new Audio("data:audio/mp3;base64," + data.audio).play();
            }
        };

        recorder.start();

        // Record 3 seconds
        setTimeout(() => recorder.stop(), 3000);

    } catch (err) {
        addMessage("Mic error: " + err.message, "ai");
    }
}
