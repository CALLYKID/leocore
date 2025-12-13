console.log("✅ app.js loaded");

/* ============================================================
   GLOBAL STATE
============================================================ */
let isStreaming = false;
let stopRequested = false;
let controller = null;

/* ============================================================
   VIEWPORT LOCK (MOBILE SAFE)
============================================================ */
function setVh() {
  document.documentElement.style.setProperty(
    "--vh",
    window.innerHeight * 0.01 + "px"
  );
}
setVh();
window.addEventListener("resize", setVh);

/* ============================================================
   BACKEND WARM-UP (RENDER COLD START FIX)
============================================================ */
async function warmBackend() {
  try {
    await fetch("https://leocore.onrender.com/ping", {
      method: "GET",
      cache: "no-store"
    });
  } catch {
    // intentionally silent
  }
}

/* ============================================================
   MODE MAP
============================================================ */
let currentMode = "default";

const MODE_MAP = {
  default:   { label: "⚡ Default",   desc: "Balanced answers for everyday questions" },
  study:     { label: "📘 Study",     desc: "Clear explanations with examples" },
  research:  { label: "🔬 Research",  desc: "Detailed, structured, and factual" },
  reading:   { label: "📖 Reading",   desc: "Summaries and simplified explanations" },
  deep:      { label: "🧠 Deep",      desc: "Long-form reasoning and insights" },
  chill:     { label: "😎 Chill",     desc: "Casual, friendly conversation" },
  precision: { label: "🎯 Precision", desc: "Short, exact, no fluff answers" },
  flame:     { label: "🔥 Flame",     desc: "Creative, bold, high-energy responses" }
};

const MODE_KEYS = Object.keys(MODE_MAP);

/* ============================================================
   DOM READY — ALL DOM WORK LIVES HERE (CRASH-PROOF)
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧠 DOM ready");

  /* ---------------- DOM REFERENCES ---------------- */
  const chatOverlay  = document.getElementById("chat-overlay");
  const chatCloseBtn = document.getElementById("chatCloseBtn");
  const chatMessages = document.getElementById("chatMessages");
  const chatForm     = document.getElementById("chatForm");
  const chatInput    = document.getElementById("chatInput");
  const sendBtn      = document.getElementById("sendBtn");

  const chatMode     = document.getElementById("chatMode");
  const chatModeDesc = document.getElementById("chatModeDesc");

  const heroInput    = document.querySelector(".hero-input");
  const modeButtons  = document.querySelectorAll(".neon-btn");

  if (!chatForm || !chatInput || !sendBtn || !chatOverlay) {
    console.error("❌ Critical DOM missing — JS halted safely");
    return;
  }

  /* ---------------- MODE CONTROL ---------------- */
  function setMode(modeKey) {
    const m = MODE_MAP[modeKey] || MODE_MAP.default;
    currentMode = modeKey;
    if (chatMode) chatMode.textContent = m.label;
    if (chatModeDesc) chatModeDesc.textContent = m.desc;
  }
  setMode("default");

  /* ---------------- CHAT OPEN / CLOSE ---------------- */
  function openChat() {
    chatOverlay.setAttribute("aria-hidden", "false");
    warmBackend(); // 🔥 warm immediately
  }

  function closeChat() {
    chatOverlay.setAttribute("aria-hidden", "true");
  }

  if (chatCloseBtn) {
    chatCloseBtn.addEventListener("click", closeChat);
  }

  if (heroInput) {
    heroInput.addEventListener("click", () => {
      setMode("default");
      openChat();
    });
  }

  modeButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      setMode(MODE_KEYS[index] || "default");
      openChat();
    });
  });

  /* ---------------- HERO FAKE TYPING ---------------- */
  const fakeText = document.getElementById("hero-text");
  if (fakeText) {
    const phrases = [
      "Message LeoCore",
      "Build me a plan",
      "Help me revise",
      "I'm ready",
      "Give me a funny joke",
      "Let's chat"
    ];

    let p = 0, c = 0, state = "typing";

    (function loop() {
      const text = phrases[p];
      if (state === "typing") {
        fakeText.textContent = text.slice(0, ++c);
        if (c === text.length) {
          state = "pausing";
          setTimeout(() => (state = "deleting"), 1200);
        }
      } else if (state === "deleting") {
        fakeText.textContent = text.slice(0, --c);
        if (c === 0) {
          state = "typing";
          p = (p + 1) % phrases.length;
        }
      }
      setTimeout(loop, state === "deleting" ? 40 : 70);
    })();
  }

  /* ---------------- MESSAGE HELPERS ---------------- */
  function addMessage(text, type) {
    const msg = document.createElement("div");
    msg.className = `chat-message ${type}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function setStreamingState(on) {
    isStreaming = on;
    stopRequested = false;
    sendBtn.classList.toggle("streaming", on);
  }

  function createLeoOrbitalBubble() {
    const msg = document.createElement("div");
    msg.className = "chat-message leocore thinking";
    msg.innerHTML = `<div class="orbit-loader"></div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
  }

  async function streamIntoBubble(el, text) {
    el.classList.remove("thinking");
    el.textContent = "";
    setStreamingState(true);

    for (let i = 0; i < text.length; i++) {
      if (stopRequested) break;
      el.textContent += text[i];
      chatMessages.scrollTop = chatMessages.scrollHeight;
      await new Promise(r => setTimeout(r, 12));
    }

    setStreamingState(false);
  }
   /* ============================================================
     SEND MESSAGE → BACKEND (STOP / SEND SAFE)
  ============================================================ */
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    /* ---------- STOP MODE ---------- */
    if (isStreaming && controller && "AbortController" in window) {
      controller.abort();
      stopRequested = true;
      setStreamingState(false);
      return;
    }

    /* ---------- SEND MODE ---------- */
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    chatInput.value = "";

    const leoBubble = createLeoOrbitalBubble();

    controller = ("AbortController" in window)
      ? new AbortController()
      : null;

    try {
      setStreamingState(true);

      const res = await fetch("https://leocore.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller?.signal,
        body: JSON.stringify({
          message: text,
          mode: currentMode
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = await res.text();
      const data = JSON.parse(raw);

      await streamIntoBubble(leoBubble, data.reply || "No response.");

    } catch (err) {
      if (err.name !== "AbortError") {
        leoBubble.textContent = "⚠️ Backend unavailable.";
      }
      setStreamingState(false);
    }
  });
});
