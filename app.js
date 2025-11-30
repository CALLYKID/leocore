// ===============================================================
// ENSURE DOM IS READY BEFORE ANYTHING RUNS
// ===============================================================
window.addEventListener("DOMContentLoaded", () => {

    // ===============================================================
    // ORB STATE
    // ===============================================================
    let isRecording = false;
    let stopRecording = null;

    const orb = document.getElementById("orb");
    const shockwave = document.getElementById("shockwave");

    orb.addEventListener("click", () => {
        if (!isRecording) startRecording();
        else stopRecording();
    });

    // ===============================================================
    // START RECORDING — UNIVERSAL ANDROID + WHISPER SAFE (WAV)
    // ===============================================================
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 48000,
                    channelCount: 1,
                    noiseSuppression: false,
                    echoCancellation: false,
                    autoGainControl: false
                }
            });

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 48000
            });

            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            let samples = [];

            processor.onaudioprocess = e => {
                samples.push(new Float32Array(e.inputBuffer.getChannelData(0)));
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            // UI
            isRecording = true;
            orb.classList.add("listening");
            shockwave.style.opacity = "0.9";
            shockwave.style.transform = "translate(-50%, -50%) scale(3)";
            addMessage("🎤 Listening… tap again to stop.", "user");

            // STOP FUNCTION (REPLACED)
            stopRecording = async () => {
                processor.disconnect();
                source.disconnect();
                stream.getTracks().forEach(t => t.stop());
                isRecording = false;

                orb.classList.remove("listening");
                shockwave.style.opacity = "0";
                shockwave.style.transform = "translate(-50%, -50%) scale(0)";

                // MERGE SAMPLES
                let length = samples.reduce((a, b) => a + b.length, 0);
                let pcm = new Float32Array(length);
                let offset = 0;
                for (let chunk of samples) {
                    pcm.set(chunk, offset);
                    offset += chunk.length;
                }

                // ENCODE WAV
                const wavBlob = encodeWAV(pcm, audioContext.sampleRate);

                addMessage("DEBUG SIZE: " + wavBlob.size, "ai"); // keep for testing

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Audio = reader.result.split(",")[1];

                    addMessage("🎤 Processing…", "user");
                    const data = await sendToGroq(null, base64Audio);

                    addMessage(data.reply, "ai");

                    if (data.audio) {
                        const audio = new Audio("data:audio/mp3;base64," + data.audio);
                        audio.play().catch(() => {});
                    }
                };

                reader.readAsDataURL(wavBlob);
            };

        } catch (err) {
            console.error(err);
            addMessage("Mic blocked — enable microphone access.", "ai");
        }
    }

    // ===============================================================
    // WAV ENCODER — WHISPER SAFE FORMAT
    // ===============================================================
    function encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        function writeString(v, s, o) {
            for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
        }

        writeString(view, "RIFF", 0);
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, "WAVE", 8);
        writeString(view, "fmt ", 12);
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(view, "data", 36);
        view.setUint32(40, samples.length * 2, true);

        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }

        return new Blob([buffer], { type: "audio/wav" });
    }

    // ===============================================================
    // CHAT SYSTEM UI
    // ===============================================================
    const chatScreen = document.getElementById("chatScreen");
    const openChat = document.getElementById("openChat");
    const closeChat = document.getElementById("closeChat");
    const messages = document.getElementById("messages");
    const input = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");

    openChat.addEventListener("click", () => chatScreen.classList.add("active"));
    closeChat.addEventListener("click", () => chatScreen.classList.remove("active"));

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
