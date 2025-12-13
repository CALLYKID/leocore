/* ============================================================
   LEOCORE APP.JS — FINAL STABLE BUILD
============================================================ */

/* ================= GLOBAL STATE ================= */
let isStreaming = false;
let stopRequested = false;
let controller = null;

/* ================= USER ID (REQUIRED) ================= */
const USER_ID =
  localStorage.getItem("leocore_uid") ||
  (() => {
    const id = crypto.randomUUID();
    localStorage.setItem("leocore_uid", id);
    return id;
  })();

/* ================= VIEWPORT LOCK ================= */
function setVh() {
  document.documentElement.style.setProperty(
    "--vh",
    window.innerHeight * 0.01 + "px"
  );
}
setVh();
window.addEventListener("resize", setVh);

/* ================= BACKEND WARM ================= */
async function warmBackend() {
  try {
    await fetch("https://leocore.onrender.com/ping", {
      method: "GET",
      cache: "no-store"
    });
  } catch {
    /* silent */
  }
}

/* ================= DOM READY ================= */
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM ready");
  initHeroTyping();
  initModes();
});

/* ================= HERO FAKE TYPING ================= */
function initHeroTyping() {
  const fakeText = document.getElementById("hero-text");
  if (!fakeText) return;

  const phrases = [
    "Message LeoCore",
    "Build me a plan",
    "Help me revise",
    "I'm ready",
    "Give me a funny joke",
    "Let's chat"
  ];

  let p = 0, c = 0, mode = "type";

  function loop() {
    const t = phrases[p];

    if (mode === "type") {
      fakeText.textContent = t.slice(0, ++c);
      if (c === t.length) {
        mode = "pause";
        setTimeout(() => (mode = "delete"), 1200);
      }
    } else if (mode === "delete") {
      fakeText.textContent = t.slice(0, --c);
      if (c === 0) {
        mode = "type";
        p = (p + 1) % phrases.length;
      }
    }
    setTimeout(loop, mode === "delete" ? 40 : 70);
  }

  loop();
}

/* ================= MODES ================= */
let currentMode = "default";

const MODE_MAP = {
  default: { label: "⚡ Default", desc: "Balanced answers for everyday questions" },
  study: { label: "📘 Study", desc: "Clear explanations with examples" },
  research: { label: "🔬 Research", desc: "Detailed, structured, and factual" },
  reading: { label: "📖 Reading", desc: "Summaries and simplified explanations" },
  deep: { label: "🧠 Deep", desc: "Long-form reasoning and insights" },
  chill: { label: "😎 Chill", desc: "Casual, friendly conversation" },
  precision: { label: "🎯 Precision", desc: "Short, exact, no fluff answers" },
  flame: { label: "🔥 Flame", desc: "Creative, bold, high-energy responses" }
};

const MODE_KEYS = Object.keys(MODE_MAP);

/* ================= DOM REFS ================= */
const chatOverlay  = document.getElementById("chat-overlay");
const chatCloseBtn = document.getElementById("chatCloseBtn");
const chatMessages = document.getElementById("chatMessages");
const chatForm     = document.getElementById("chatForm");
const chatInput    = document.getElementById("chatInput");
const chatMode     = document.getElementById("chatMode");
const chatModeDesc = document.getElementById("chatModeDesc");
const heroInput    = document.querySelector(".hero-input");
const modeButtons  = document.querySelectorAll(".neon-btn");
const sendBtn      = document.getElementById("sendBtn");

/* ================= MODE INIT ================= */
function initModes() {
  setMode("default");
}

function setMode(key) {
  const m = MODE_MAP[key] || MODE_MAP.default;
  currentMode = key;
  chatMode.textContent = m.label;
  chatModeDesc.textContent = m.desc;
}

/* ================= CHAT OPEN/CLOSE ================= */
function openChat() {
  chatOverlay.setAttribute("aria-hidden", "false");
  warmBackend();
}

function closeChat() {
  chatOverlay.setAttribute("aria-hidden", "true");
}

chatCloseBtn.addEventListener("click", closeChat);

heroInput.addEventListener("click", () => {
  setMode("default");
  openChat();
});

modeButtons.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    setMode(MODE_KEYS[i] || "default");
    openChat();
  });
});

/* ================= MESSAGE HELPERS ================= */
function addMessage(text, type) {
  const el = document.createElement("div");
  el.className = `chat-message ${type}`;
  el.textContent = text;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createLeoOrbitalBubble() {
  const el = document.createElement("div");
  el.className = "chat-message leocore thinking";
  el.innerHTML = `<div class="orbit-loader"></div>`;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return el;
}

function setStreamingState(on) {
  isStreaming = on;
  sendBtn.classList.toggle("streaming", on);
}

/* ================= STREAM SIM ================= */
async function streamIntoBubble(el, text) {
  el.classList.remove("thinking");
  el.textContent = "";

  setStreamingState(true);
  stopRequested = false;

  for (let i = 0; i < text.length; i++) {
    if (stopRequested) break;
    el.textContent += text[i];
    chatMessages.scrollTop = chatMessages.scrollHeight;
    await new Promise(r => setTimeout(r, 12));
  }

  setStreamingState(false);
}

/* ================= SEND MESSAGE ================= */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  /* STOP MODE */
  if (isStreaming) {
    stopRequested = true;
    if (controller) controller.abort();
    setStreamingState(false);
    return;
  }

  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  chatInput.value = "";

  const leoBubble = createLeoOrbitalBubble();
  controller = new AbortController();

  try {
    const res = await fetch(
      /* 🔴 CHANGE THIS IF NEEDED */
      "https://leocore.onrender.com/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          mode: currentMode,
          userId: USER_ID
        })
      }
    );

    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    await streamIntoBubble(leoBubble, data.reply);

  } catch (err) {
    if (err.name !== "AbortError") {
      leoBubble.textContent = "⚠️ Backend unavailable.";
    }
    setStreamingState(false);
  }
});
