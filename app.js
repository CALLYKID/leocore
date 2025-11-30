// ===============================================================
// ENSURE DOM IS READY BEFORE ANYTHING RUNS
// ===============================================================
window.addEventListener("DOMContentLoaded", () => {

    // ===============================================================
// ORB VOICE CONTROL — ANDROID + WHISPER FIXED VERSION
// ===============================================================
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

const orb = document.getElementById("orb");
const shockwave = document.getElementById("shockwave");

// Tap = Start / Stop mic
orb.addEventListener("click", () => {
    if (!isRecording) startRecording();
    else stopRecording();
});


// ===============================================================
// START RECORDING — NEW ANDROID FIX
// ===============================================================
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                noiseSuppression: false,
                echoCancellation: false,
                autoGainControl: false
            }
        });

        const mime = "audio/webm;codecs=opus";

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: mime,
            bitsPerSecond: 192000
        });

        audioChunks = [];

        mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: mime });

            addMessage("DEBUG SIZE: " + blob.size, "ai");

            if (blob.size < 3000) {
                addMessage("🎤 I didn't catch that, try speaking louder.", "ai");
                return;
            }

            const reader = new FileReader();

            reader.onloadend = async () => {
                let base64Audio = reader.result.split(",")[1];

                addMessage("🎤 Listening ended…", "user");

                const data = await sendToGroq(null, base64Audio);
                addMessage(data.reply, "ai");

                if (data.audio) {
                    const a = new Audio("data:audio/mp3;base64," + data.audio);
                    a.play().catch(() => {});
                }
            };

            reader.readAsDataURL(blob);
        };

        mediaRecorder.start(200);

        isRecording = true;
        orb.classList.add("listening");
        shockwave.style.opacity = "0.9";
        shockwave.style.transform = "translate(-50%, -50%) scale(3)";

        addMessage("🎤 Listening… tap again to stop.", "user");

    } catch (err) {
        console.error(err);
        addMessage("Mic blocked — enable microphone access.", "ai");
    }
}


// ===============================================================
// STOP RECORDING
// ===============================================================
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

    function addMessage(text, sender) {
        const div = document.createElement("div");
        div.className = sender === "user" ? "user-msg" : "ai-msg";
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    // ===============================================================
    // SEND TO BACKEND
    // ===============================================================
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

            const raw = await res.text();
            console.log("RAW BACKEND:", raw);

            try {
                return JSON.parse(raw);
            } catch {
                return { reply: "Backend returned invalid JSON.", audio: null };
            }

        } catch (err) {
            return {
                reply: "Network error: " + err.message,
                audio: null
            };
        }
    }

    // ===============================================================
    // TEXT SEND BUTTON
    // ===============================================================
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
