// =============================
// ORB + VOICE RECORDING
// =============================

// DOM
const orb = document.getElementById("orb");
const messages = document.getElementById("messages");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatScreen = document.getElementById("chatScreen");
const openChat = document.getElementById("openChat");
const closeChat = document.getElementById("closeChat");

// --- VOICE RECORDER ---
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64Audio = reader.result.split(",")[1];

                // SEND AUDIO TO BACKEND
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ audio: base64Audio })
                });

                const data = await res.json();

                addMessage("🎤 Voice message", "user");
                addMessage(data.reply, "ai");

                if (data.audio) {
                    const audio = new Audio("data:audio/mp3;base64," + data.audio);
                    audio.play();
                }
            };

            reader.readAsDataURL(blob);
        };

        mediaRecorder.start();
        console.log("🎙 recording…");

        // Auto-stop after 1.5s
        setTimeout(() => mediaRecorder.stop(), 1500);

    } catch (err) {
        console.log("Mic error:", err);
        addMessage("Mic access blocked.", "ai");
    }
}

// --- ORB CLICK ---
orb.addEventListener("click", () => {
    console.log("ORB CLICKED");
    startRecording();

    // POP EFFECT
    orb.style.transform = "scale(1.12)";
    setTimeout(() => (orb.style.transform = ""), 250);

    // SHOCKWAVE
    const shock = document.getElementById("shockwave");
    shock.style.transform = "translate(-50%, -50%) scale(5)";
    shock.style.opacity = "0.7";

    setTimeout(() => {
        shock.style.transform = "translate(-50%, -50%) scale(0)";
        shock.style.opacity = "0";
    }, 300);
});

// =============================
// CHAT SYSTEM
// =============================

// open + close UI
openChat.addEventListener("click", () => chatScreen.classList.add("active"));
closeChat.addEventListener("click", () => chatScreen.classList.remove("active"));

// Add text bubble
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-msg" : "ai-msg";
    div.innerText = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// SEND TEXT TO BACKEND
async function sendToBackend(prompt) {
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

// TEXT SEND BUTTON
sendBtn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    addMessage("Processing...", "ai");

    const data = await sendToBackend(text);

    messages.lastChild.remove();
    addMessage(data.reply, "ai");

    if (data.audio) {
        const audio = new Audio("data:audio/mp3;base64," + data.audio);
        audio.play().catch(() => {});
    }
});
