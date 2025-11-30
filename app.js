// ===============================================================
// ORB VOICE CONTROL
// ===============================================================
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

const orb = document.getElementById("orb");
const shockwave = document.getElementById("shockwave");

// Tap = Start / Stop mic
orb.addEventListener("click", () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});


// ===============================================================
// START RECORDING (FIXED FOR ANDROID + WHISPER)
// ===============================================================
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        // 🔥 FIX 1: Use proper codec and force bitrate (Android needs this)
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: mime,
            audioBitsPerSecond: 128000  // <<< prevents silent recordings
        });

        audioChunks = [];

        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = async () => {
            // 🔥 FIX 2: Combine chunks properly
            const blob = new Blob(audioChunks, { type: mime });

            // Debug check
            console.log("Recorded blob size:", blob.size);

            if (blob.size < 4000) {  
                addMessage("🎤 I couldn't hear anything. Try again.", "ai");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                let base64Audio = reader.result.split(",")[1];

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

        mediaRecorder.start(200); // gather data every 200ms
        isRecording = true;

        // UI animation
        orb.classList.add("listening");
        shockwave.style.transform = "translate(-50%, -50%) scale(3)";
        shockwave.style.opacity = "0.9";

        addMessage("🎤 Listening… tap again to stop.", "user");

    } catch (err) {
        console.error(err);
        addMessage("Mic blocked — enable microphone access.", "ai");
    }
}
