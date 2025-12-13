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
    // silent — only waking backend
  }
}


/* ============================================================
   HERO FAKE TYPING
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
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

  let phraseIndex = 0;
  let charIndex = 0;
  let state = "typing";

  function loop() {
    const current = phrases[phraseIndex];

    if (state === "typing") {
      fakeText.textContent = current.slice(0, ++charIndex);
      if (charIndex === current.length) {
        state = "pausing";
        setTimeout(() => (state = "deleting"), 1200);
      }
    } else if (state === "deleting") {
      fakeText.textContent = current.slice(0, --charIndex);
      if (charIndex === 0) {
        state = "typing";
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }

    setTimeout(loop, state === "deleting" ? 40 : 70);
  }

  loop();
});


/* ============================================================
   CHAT STATE + MODE MAP
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
   DOM REFERENCES
============================================================ */
const chatOverlay  = document.getElementById("chat-overlay");
const chatCloseBtn = document.getElementById("chatCloseBtn");
const chatMessages = document.getElementById("chatMessages");
const chatForm     = document.getElementById("chatForm");
const chatInput    = document.getElementById("chatInput");

const chatMode     = document.getElementById("chatMode");
const chatModeDesc = document.getElementById("chatModeDesc");

const heroInput   = document.querySelector(".hero-input");
const modeButtons = document.querySelectorAll(".neon-btn");


/* ============================================================
   MODE CONTROL
============================================================ */
function setMode(modeKey) {
  const m = MODE_MAP[modeKey] || MODE_MAP.default;
  currentMode = modeKey;
  chatMode.textContent = m.label;
  chatModeDesc.textContent = m.desc;
}

document.addEventListener("DOMContentLoaded", () => {
  setMode("default");
});


/* ============================================================
   CHAT OPEN / CLOSE
============================================================ */
function openChat() {
  chatOverlay.setAttribute("aria-hidden", "false");
  setTimeout(() => chatInput.focus(), 200);
}

function closeChat() {
  chatOverlay.setAttribute("aria-hidden", "true");
}

chatCloseBtn.addEventListener("click", closeChat);


/* ============================================================
   HERO + MODE BUTTONS
============================================================ */
heroInput.addEventListener("click", () => {
  setMode("default");
  openChat();
});

modeButtons.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    setMode(MODE_KEYS[index] || "default");
    openChat();
  });
});


/* ============================================================
   MESSAGE HELPERS
============================================================ */
function addMessage(text, type) {
  const msg = document.createElement("div");
  msg.className = `chat-message ${type}`;
  msg.innerHTML = text;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


/* ============================================================
   INLINE THINKING PLACEHOLDER (PIXEL-PERFECT)
============================================================ */
function createThinkingBubble() {
  const msg = document.createElement("div");
  msg.className = "chat-message leocore thinking";
  msg.innerHTML = `
    <span class="thinking-dots">
      <span></span><span></span><span></span>
    </span>
  `;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msg;
}


/* ============================================================
   STREAM INTO SAME BUBBLE (NO JUMP, NO DUPLICATE)
============================================================ */
async function streamIntoBubble(el, text) {
  el.classList.remove("thinking");
  el.innerHTML = "";

  for (let i = 0; i < text.length; i++) {
    el.innerHTML += text[i];
    chatMessages.scrollTop = chatMessages.scrollHeight;
    await new Promise(r => setTimeout(r, 12));
  }
}


/* ============================================================
   SEND MESSAGE → BACKEND
============================================================ */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  chatInput.value = "";

  const leoBubble = createThinkingBubble();

  try {
    await warmBackend();

    const res = await fetch("https://leocore.onrender.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        userId: "leo-user",
        mode: currentMode
      })
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();

    await streamIntoBubble(leoBubble, data.reply || "...");

  } catch (err) {
    console.error("CHAT ERROR:", err);
    leoBubble.classList.remove("thinking");
    leoBubble.innerHTML = "⚠️ Connection error. Try again.";
  }
});
