// ===============================================================
// ORB VOICE CONTROL (Tap to start • Tap to stop)
// ===============================================================
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

const orb = document.getElementById("orb");
const shockwave = document.getElementById("shockwave");

// Start or stop recording when orb is tapped
orb.addEventListener("click", async () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

// Start recording -------------------------------------------------
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: "audio/webm" });

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Audio = reader.result.split(",")[1];

                addMessage("🎤 Listening ended…", "user");

                const data = await sendToGroq(null, base64Audio);

                addMessage(data.reply, "ai");

                if (data.audio) {
                    const audio = new Audio("data:audio/mp3;base64," + data.audio);
                    audio.play().catch(() => {});
                }
            };

            reader.readAsDataURL(blob);
        };

        mediaRecorder.start();

        isRecording = true;

        orb.classList.add("listening");
        shockwave.style.transform = "translate(-50%, -50%) scale(3)";
        shockwave.style.opacity = "0.9";

        addMessage("🎤 Listening… tap again to stop.", "user");

    } catch (err) {
        console.error(err);
        addMessage("Mic blocked. Enable microphone access.", "ai");
    }
}

// Stop recording ---------------------------------------------------
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
    }

    isRecording = false;

    orb.classList.remove("listening");
    shockwave.style.opacity = "0";
    shockwave.style.transform = "translate(-50%, -50%) scale(0)";
}



// ===============================================================
// CHAT SYSTEM
// ===============================================================
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


// Add message bubble ----------------------------------------------
function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = sender === "user" ? "user-msg" : "ai-msg";
    div.innerText = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}


// Send to backend ---------------------------------------------------
async function sendToGroq(textMessage, audioBase64 = null) {
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: textMessage,
                audio: audioBase64
            })
        });

        return await res.json();
    } catch (err) {
        return { reply: "AI error: " + err.message };
    }
}


// Text send button ---------------------------------------------------
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
