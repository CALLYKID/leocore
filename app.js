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
      fakeText.textContent = current.slice(0, charIndex + 1);
      charIndex++;

      if (charIndex === current.length) {
        state = "pausing";
        setTimeout(() => (state = "deleting"), 1200);
      }
    } else if (state === "deleting") {
      fakeText.textContent = current.slice(0, charIndex - 1);
      charIndex--;

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
  default: {
    label: "⚡ Default",
    desc: "Balanced answers for everyday questions"
  },
  study: {
    label: "📘 Study",
    desc: "Clear explanations with examples"
  },
  research: {
    label: "🔬 Research",
    desc: "Detailed, structured, and factual"
  },
  reading: {
    label: "📖 Reading",
    desc: "Summaries and simplified explanations"
  },
  deep: {
    label: "🧠 Deep",
    desc: "Long-form reasoning and insights"
  },
  chill: {
    label: "😎 Chill",
    desc: "Casual, friendly conversation"
  },
  precision: {
    label: "🎯 Precision",
    desc: "Short, exact, no fluff answers"
  },
  flame: {
    label: "🔥 Flame",
    desc: "Creative, bold, high-energy responses"
  }
};

const MODE_KEYS = Object.keys(MODE_MAP);

/* ============================================================
   DOM REFERENCES
============================================================ */
const chatOverlay = document.getElementById("chat-overlay");
const chatCloseBtn = document.getElementById("chatCloseBtn");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const typingIndicator = document.getElementById("typingIndicator");

const chatMode = document.getElementById("chatMode");
const chatModeDesc = document.getElementById("chatModeDesc");

const heroInput = document.querySelector(".hero-input");
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

/* Reset to Default on reload */
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
   HERO → DEFAULT CHAT
============================================================ */
heroInput.addEventListener("click", () => {
  setMode("default");
  openChat();
});

/* ============================================================
   MODE BUTTONS → CHAT
============================================================ */
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
  msg.innerHTML = text; // backend sends <br>
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ============================================================
   FAKE STREAMING (PREMIUM ILLUSION)
============================================================ */
async function fakeStream(text) {
  let i = 0;
  const msg = document.createElement("div");
  msg.className = "chat-message leocore";
  chatMessages.appendChild(msg);

  while (i < text.length) {
    msg.innerHTML += text[i];
    i++;
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

  typingIndicator.hidden = false;
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const res = await fetch(
  "https://leocore-backend.onrender.com/api/chat",
       {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        userId: "leo-user",
        mode: currentMode
      })
    });

    const data = await res.json();
    typingIndicator.hidden = true;

    if (data.reply) {
      await fakeStream(data.reply);
    }

  } catch (err) {
    typingIndicator.hidden = true;
    addMessage("⚠️ Connection error. Try again.", "leocore");
  }
});
