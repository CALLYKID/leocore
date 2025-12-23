  /* ===========================================================
   LEOCORE APP.JS — FINAL STABLE BUILD
============================================================ */

/* ================= GLOBAL STATE ================= */
let isStreaming = false;
let stopRequested = false;
let controller = null;
let userLockedScroll = true;
let rafScroll = null;
const MEMORY_LIMIT = 8;
let userPowerSave = false;

/* ================= USER ID ================= */
const USER_ID =
  localStorage.getItem("leocore_uid") ||
  (() => {
    const id = crypto.randomUUID();
    localStorage.setItem("leocore_uid", id);
    return id;
  })();
  
  /* ================= PROFILE MEMORY ================= */
const PROFILE_KEY = "leocore_profile_v1";

function loadProfile() {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY));
    return data || {
      joined: Date.now(),
      messagesSent: 0,
      streak: 0
    };
  } catch {
    return {
      joined: Date.now(),
      messagesSent: 0,
      streak: 0
    };
  }
}

function saveProfile(patch) {
  const current = loadProfile();
  const updated = { ...current, ...patch };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  return updated;
}

/* ================= API CONFIG ================= */
const API_URL =
  location.hostname === "localhost" || location.protocol === "file:"
    ? "http://localhost:10000"
    : "https://leocore.onrender.com";
    
/* ================= VIEWPORT LOCK ================= */
function setVh() {
  document.documentElement.style.setProperty(
    "--vh",
    window.innerHeight * 0.01 + "px"
  );
}
setVh();
window.addEventListener("resize", setVh);
window.addEventListener("orientationchange", setVh);

// Restore saved power mode
userPowerSave = localStorage.getItem("lpMode") === "1";
if (userPowerSave) {
  document.body.classList.add("chat-freeze");
}
const lp = document.getElementById("lpStatus");
if (lp) lp.textContent = userPowerSave ? "ON" : "OFF";
/* ================= BACKEND WARM ================= */
 async function warmBackend() {
  try {
    await fetch(`${API_URL}/ping`, {
      method: "GET",
      cache: "no-store"
    });
  } catch {}
}

/* ================================================
   AUTO THERMAL CONTROL — PHASE 1
================================================ */
let thermalSamples = [];
let thermalActive = false;

function getFPS(callback) {
  let last = performance.now();
  let frames = 0;

  function frame() {
    const now = performance.now();
    frames++;

    if (now >= last + 1000) {
      callback(frames);
      frames = 0;
      last = now;
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function enableThermalMode() {
  if (thermalActive || userPowerSave) return;
  thermalActive = true;
  document.body.classList.add("chat-freeze");
  
  requestAnimationFrame(() => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
  console.log("🔥 Thermal Mode ENABLED");
}

function disableThermalMode() {
  if (!thermalActive) return;
  thermalActive = false;

  if (!userPowerSave) {
    document.body.classList.remove("chat-freeze");
  }
  
  requestAnimationFrame(() => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
  console.log("❄️ Thermal Mode DISABLED");
}

getFPS(fps => {
  thermalSamples.push(fps);
  if (thermalSamples.length > 6) thermalSamples.shift();

  const avg = thermalSamples.reduce((a,b)=>a+b,0) / thermalSamples.length;

  // enter protection aggressively
if (avg < 45) enableThermalMode();

// exit protection slowly (prevents flip-flop)
if (avg > 62) disableThermalMode();
});  
/* ================= SAFE FETCH WITH RETRY ================= */
async function fetchWithRetry(url, options, retries = 4, delay = 1800) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
/* ================= HERO FAKE TYPING ================= */
function initHeroTyping() {
  const el = document.getElementById("hero-text");
  if (!el) return;

  const phrases = [
    "Message LeoCore",
    "Build me a plan",
    "Help me revise",
    "I'm ready",
    "Give me a funny joke",
    "Let's chat"
  ];

  let p = 0, c = 0, mode = "type";

  (function loop() {
    const t = phrases[p];

    if (mode === "type") {
      el.textContent = t.slice(0, ++c);
      if (c === t.length) {
        mode = "pause";
        setTimeout(() => (mode = "delete"), 1200);
      }
    } else if (mode === "delete") {
      el.textContent = t.slice(0, --c);
      if (c === 0) {
        mode = "type";
        p = (p + 1) % phrases.length;
      }
    }
    setTimeout(loop, mode === "delete" ? 40 : 70);
  })();
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
const sendBtn      = document.getElementById("sendBtn");

const chatClearBtn = document.getElementById("clearChat");

chatClearBtn?.addEventListener("click", () => {
  const ok = confirm("Clear this conversation?");
  if (!ok) return;

  clearCurrentModeChat();
});

const intentStrip = document.querySelector(".intent-strip");

intentStrip?.addEventListener("click", () => {
  setMode("default");
  history.pushState({}, "", "/modes/default");
  openChat();
});
window.addEventListener("load", () => {
  const vid = document.getElementById("bg-video");
  vid?.play().catch(() => {});
});

function formatLeoReply(text) {
  if (!text) return "";

  // --- 0️⃣ SECURITY: Escape HTML first ---
  text = text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // --- 1️⃣ Handle Bold: **text** OR __text__ ---
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // --- 2️⃣ Headings: ## or ### turn into styled titles ---
  text = text.replace(/^###\s?(.*)$/gm,
    '<div style="font-size:15px;font-weight:700;margin:8px 0 4px">$1</div>'
  );
  text = text.replace(/^##\s?(.*)$/gm,
    '<div style="font-size:17px;font-weight:800;margin:10px 0 6px">$1</div>'
  );

  // --- 3️⃣ Numbered lists ---
  text = text.replace(/^\s*(\d+)\.\s+(.*)/gm,
    '<div style="margin-left:12px;margin-bottom:4px">$1. $2</div>'
  );

  // --- 4️⃣ Bullet lists (- or *) ---
  text = text.replace(/^\s*[\-\*]\s+(.*)/gm,
    '<div style="margin-left:12px;margin-bottom:4px">• $1</div>'
  );

  // --- 5️⃣ Inline Code ---
  text = text.replace(/`([^`]+)`/g,
    '<code style="background:rgba(255,255,255,0.12);padding:3px 6px;border-radius:6px;">$1</code>'
  );

// --- 6️⃣ Paragraph Spacing ---
text = text
  .replace(/\r/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

let parts = text
  .split(/\n\n/)
  .map(p => p.trim())
  .filter(p => p.length > 0)
  .map(p => p.replace(/\n/g, "<br>"));

text = parts
  .map(p => `<div style="margin: 6px 0; line-height: 1.6">${p}</div>`)
  .join("");
  
return text;
}
/* ================= CHAT STORAGE ================= */
const CHAT_STORE_KEY = "leocore_chats_v1";

function loadAllChats() {
  try {
    const data = JSON.parse(localStorage.getItem(CHAT_STORE_KEY));
    return data || {};
  } catch {
    return {};
  }
}

function saveCurrentChat() {
  const allChats = loadAllChats();

  allChats[currentMode] = {
    messages: [...chatMessages.children]
      .filter(el =>
        (el.classList.contains("user") || el.classList.contains("leocore")) &&
        !el.classList.contains("thinking")
      )
      .map(el => ({
        role: el.classList.contains("user") ? "user" : "leocore",
        // USE textContent here so we save raw text for the AI memory
        content: el.textContent 
      })),
    updatedAt: Date.now()
  };

  localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(allChats));
}

function restoreChatForMode(mode) {
  const allChats = loadAllChats();
  const data = allChats[mode];

  // Remove only real chat message bubbles
[...chatMessages.children].forEach(el => {
  if (!el.id || el.id !== "emptyState") {
    el.remove();
  }
});

hideEmptyState();

  if (!data || !Array.isArray(data.messages) || data.messages.length === 0) {
    showEmptyState();
    return;
  }

  data.messages.forEach(msg => {
    renderMessage(msg.content, msg.role);
  });

  jumpToBottom(chatMessages);
}

function getMemoryForMode(mode, limit = 8) {
  const allChats = loadAllChats();
  const data = allChats[mode];

  if (!data || !Array.isArray(data.messages)) return [];

  return data.messages.slice(-limit);
}

function clearCurrentModeChat() {
  const allChats = loadAllChats();

  if (allChats[currentMode]) {
    delete allChats[currentMode];
    localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(allChats));
  }

  chatMessages.innerHTML = "";
  showEmptyState();
}

/* ================= MODE INIT ================= */
function initModes() {
  const path = window.location.pathname.toLowerCase();
  if (!path.startsWith("/modes/")) {
    setMode("default");
  }
}

function setMode(key) {
  if (document.body.classList.contains("chat-open")) {
    saveCurrentChat();
  }
  
  const m = MODE_MAP[key] || MODE_MAP.default;
  currentMode = key;

  chatMode.textContent = m.label;
  chatModeDesc.textContent = m.desc;

  restoreChatForMode(key);
  updateMetaForMode(key);
}

function updateMetaForMode(mode) {
  const meta = MODE_META[mode] || MODE_META.default;

  document.title = meta.title;

  let desc = document.querySelector('meta[name="description"]');
  if (!desc) {
    desc = document.createElement("meta");
    desc.name = "description";
    document.head.appendChild(desc);
  }

  desc.content = meta.desc;
}
/* ================= CHAT OPEN / CLOSE ================= */
let freezeTimeout;

function openChat() {
  chatOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("chat-open");
  warmBackend();

  if (!hasRealMessages()) {
    showEmptyState();
  }
  requestAnimationFrame(() => {
  if (chatMessages.scrollHeight <= chatMessages.clientHeight) {
    chatMessages.scrollTop = 0;      // Force top if short chat
  } else {
    chatMessages.scrollTop = chatMessages.scrollHeight;  // Normal bottom stick
  }
});

  clearTimeout(freezeTimeout);
  freezeTimeout = setTimeout(() => {
  if (!userPowerSave) {
    document.body.classList.add("chat-freeze");
  }
}, 1800);
}

function closeChat() {
  chatOverlay.setAttribute("aria-hidden", "true");

  clearTimeout(freezeTimeout);
  document.body.classList.remove("chat-open");

if (!userPowerSave) {
  document.body.classList.remove("chat-freeze");
}
}
document.getElementById("lowPowerToggle")?.addEventListener("click", () => {
  userPowerSave = !userPowerSave;
  localStorage.setItem("lpMode", userPowerSave ? "1" : "0");

  if (userPowerSave) {
    document.body.classList.add("chat-freeze");
    document.getElementById("lpStatus").textContent = "ON";
  } else {
    document.body.classList.remove("chat-freeze");
    document.getElementById("lpStatus").textContent = "OFF";
  }
  
  requestAnimationFrame(() => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
});

/* ================= CLICK BINDINGS (MODE CARDS) ================= */

chatCloseBtn.addEventListener("click", () => {
  history.pushState({}, "", "/");
  closeChat();
});

// Bind new mode-card UI
document.querySelectorAll(".mode-card").forEach(card => {
  const mode = card.dataset.mode;
  const startBtn = card.querySelector(".mode-start");
const toggle = card.querySelector(".mode-toggle");

/* DROPDOWN ONLY ON CHEVRON */
toggle.addEventListener("click", (e) => {
  e.stopPropagation();

  document.querySelectorAll(".mode-card").forEach(c => {
    if (c !== card) c.classList.remove("active");
  });

  card.classList.toggle("active");
});

  /* =========================
     2️⃣ START BUTTON
  ==========================*/
  startBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setMode(mode || "default");
    history.pushState({}, "", `/modes/${mode}`);
    openChat();
  });

  /* =========================
     3️⃣ CARD BODY = OPEN CHAT
     (but ignore dropdown clicks)
  ==========================*/
  card.addEventListener("click", (e) => {
    if (e.target.closest(".mode-toggle")) return; // <-- IMPORTANT

    setMode(mode || "default");
    history.pushState({}, "", `/modes/${mode}`);
    openChat();
  });
});

/* ================= SCROLL HELPERS ================= */
function isNearBottom(el, threshold = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

function jumpToBottom(el) {
  el.scrollTop = el.scrollHeight;
}

function smoothToBottom(el) {
  el.scrollTo({
    top: el.scrollHeight,
    behavior: "smooth"
  });
}

let isTicking = false;

chatMessages.addEventListener("scroll", () => {
  if (!isTicking) {
    window.requestAnimationFrame(() => {
      const distance = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
      
      // If user is more than 30px from bottom, they are definitely looking at history
      userLockedScroll = (distance < 30);
      
      isTicking = false;
    });
    isTicking = true;
  }
}, { passive: true });
let lastScrollTop = 0;

chatMessages.addEventListener("scroll", () => {
  const st = chatMessages.scrollTop;
  const header = document.getElementById("chatHeader");
  if (!header) return;

  if (st > lastScrollTop + 6) {
    // scrolling DOWN → hide header
    header.classList.add("hide");
  } 
  else if (st < lastScrollTop - 6) {
    // scrolling UP → show header
    header.classList.remove("hide");
  }

  lastScrollTop = Math.max(st, 0);
}, { passive: true });


/* ================= EMPTY STATE ================= */
const EMPTY_STATES = {
  default: [
    {
      title: "What are we starting with?",
      sub: "Say anything — I’ll take it from there."
    },
    {
      title: "Let’s get into it.",
      sub: "What’s on your mind right now?"
    }
  ],
  study: [
    {
      title: "What are we studying today?",
      sub: "Name the topic — I’ll explain it clearly."
    }
  ],
  research: [
    {
      title: "What are we analysing?",
      sub: "I’ll keep it structured and factual."
    }
  ],
  deep: [
    {
      title: "What do you want to think through?",
      sub: "Take your time. I’ll go deep with you."
    }
  ],
  chill: [
    {
      title: "What’s up?",
      sub: "No pressure — just talk."
    }
  ],
  precision: [
    {
      title: "What’s the question?",
      sub: "Short answers. No fluff."
    }
  ],
  flame: [
    {
      title: "Let’s cook.",
      sub: "Say the idea — I’ll bring the energy."
    }
  ]
};
const MODE_SUGGESTIONS = {
  default: [
    "Help me with something",
    "Explain something to me",
    "Give me advice"
  ],
  study: [
    "Explain photosynthesis simply",
    "Help me revise chemistry",
    "Give me exam questions",
    "Teach me a topic"
  ],
  research: [
    "Give me a structured analysis",
    "Compare two ideas deeply",
    "Explain pros and cons",
  ],
  deep: [
    "Help me think through a problem",
    "Explain this in depth",
  ],
  chill: [
    "Talk to me",
    "Tell me something interesting",
    "Make me laugh"
  ],
  precision: [
    "Answer this fast",
    "Give short answers",
  ],
  flame: [
    "Be bold",
    "Give me something crazy creative",
  ]
};
function showEmptyState() {
  const el = document.getElementById("emptyState");
  if (!el) return;

  const pool = EMPTY_STATES[currentMode] || EMPTY_STATES.default;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  el.querySelector(".empty-title").textContent = pick.title;
  el.querySelector(".empty-sub").textContent = pick.sub;

  const sugContainer = document.getElementById("emptySuggestions");
  sugContainer.innerHTML = "";

  const sugList = MODE_SUGGESTIONS[currentMode] || MODE_SUGGESTIONS.default;

  sugList.forEach(text => {
    const btn = document.createElement("button");
    btn.textContent = text;

    btn.addEventListener("click", () => {
      chatInput.value = text;
      chatForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    sugContainer.appendChild(btn);
  });

  el.style.display = "grid";
}

function hideEmptyState() {
  const el = document.getElementById("emptyState");
  if (el) el.style.setProperty("display", "none", "important");
}

function hasRealMessages() {
  return [...chatMessages.children].some(el =>
    el.classList.contains("user") ||
    el.classList.contains("leocore")
  );
}

/* ================= MESSAGE HELPERS ================= */
function addMessage(text, type) {
  hideEmptyState();

  const el = document.createElement("div");
  el.className = `chat-message ${type}`;
  el.textContent = text;

  chatMessages.appendChild(el);

  if (isNearBottom(chatMessages)) {
    jumpToBottom(chatMessages);
  }
}

function renderMessage(text, role) {
  const el = document.createElement("div");
  el.className = `chat-message ${role}`;
  
  // If it's the AI (leocore), use marked to parse the markdown
  if (role === "leocore") {
    el.innerHTML = formatLeoReply(text);
  } else {
    el.textContent = text; // Keep user messages as plain text for safety
  }
  
  chatMessages.appendChild(el);
}


function createLeoOrbitalBubble() {
  hideEmptyState();

  const el = document.createElement("div");
  el.className = "chat-message leocore thinking";
  el.innerHTML = `
    <div class="orbit-loader">
      <span></span><span></span><span></span>
    </div>
    <div class="reply-text"></div>
  `;

  chatMessages.appendChild(el);
  jumpToBottom(chatMessages);

  return el;
}

/* ================= STREAM SIMULATION ================= */
async function streamIntoBubble(el, text) {
  stopRequested = false;
  let firstToken = true;
  setStreamingState(true);

  const textEl = el.querySelector(".reply-text") || el;

  // IMPORTANT: Set initial lock state before loop starts
  userLockedScroll = isNearBottom(chatMessages, 50);
if (userLockedScroll) {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

  for (let i = 0; i < text.length; i++) {
    if (stopRequested) {
      setStreamingState(false);
      return;
    }

    if (firstToken) {
      const loader = el.querySelector(".orbit-loader");
      if (loader) loader.remove();
      el.classList.remove("thinking");
      firstToken = false;
    }

    textEl.innerHTML = formatLeoReply(text.slice(0, i + 1));

    // ONLY scroll if the user hasn't manually scrolled up
    if (userLockedScroll) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    await new Promise(requestAnimationFrame);
  }

  // Final smooth scroll only if still locked
  if (userLockedScroll) {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

  setStreamingState(false);
  controller = null;
  saveCurrentChat();
}


const MIN_STREAM_TIME = 600; // ms
let streamStartTime = 0;

function setStreamingState(on) {
  isStreaming = on;
  if (on) {
    streamStartTime = performance.now();
    sendBtn.classList.add("streaming");
  } else {
    const elapsed = performance.now() - streamStartTime;
    const delay = Math.max(0, MIN_STREAM_TIME - elapsed);
    setTimeout(() => {
      sendBtn.classList.remove("streaming");
    }, delay);
  }
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

  stopRequested = false;
  controller = null;

  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  chatInput.value = "";
  saveCurrentChat();
requestAnimationFrame(() => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
  const leoBubble = createLeoOrbitalBubble();
  requestAnimationFrame(() => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
if (!hasRealMessages()) {
  showEmptyState();
}
  await new Promise(requestAnimationFrame);
  controller = new AbortController();

const memory = getMemoryForMode(currentMode, MEMORY_LIMIT)
  .map(m => ({
    role: m.role === "leocore" ? "assistant" : "user",
    content: m.content
  }));
  
  const profile = loadProfile();
  
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: text,
            mode: currentMode,
            userId: USER_ID,
            memory,
            profile
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let fullText = "";
    const textEl = leoBubble.querySelector(".reply-text");
    let lastWordCount = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      const loader = leoBubble.querySelector(".orbit-loader");
      if (loader) {
        loader.remove();
        leoBubble.classList.remove("thinking");
      }

// --- SMART LIVE MARKDOWN WORD STREAMING ---
const words = fullText.split(/(\s+)/);
const markdownTriggers = /(\*\*|__|`|#|\d+\.\s|-\s|\n\n)/;

let throttle = false;

while (lastWordCount < words.length) {

  if (stopRequested) return;

  lastWordCount++;

  const current = words.slice(0, lastWordCount).join("");

  // Detect if formatting is even needed
  const needsFormat = markdownTriggers.test(current);

  if (needsFormat) {
    if (!throttle) {
      throttle = true;

      textEl.innerHTML = formatLeoReply(current);

      setTimeout(() => throttle = false, 120);
    }
  } else {
    textEl.textContent = current;
  }

  if (userLockedScroll)
    chatMessages.scrollTop = chatMessages.scrollHeight;

  await new Promise(r => setTimeout(r, 25));
}
    }
    
    textEl.innerHTML = formatLeoReply(fullText);
    if (textEl) textEl.style.paddingBottom = "2px";

    setStreamingState(false);
    saveCurrentChat();
    
    requestAnimationFrame(() => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

} catch (err) {
    if (err.name !== "AbortError") {
      leoBubble.textContent = "WAKING LEOCORE🙂🙊";
    }
    setStreamingState(false);
}
});
/* ================= INTENT STRIP ROTATING TEXT ================= */

function initIntentStrip() {
  const words = document.querySelectorAll(".intent-word");
  if (!words.length) return;

  let index = 0;
  words[index].classList.add("active");

  setInterval(() => {
    words[index].classList.remove("active");
    index = (index + 1) % words.length;
    words[index].classList.add("active");
  }, 2200);
}

initIntentStrip();
const menuBtn = document.getElementById("menuBtn");
const menuOverlay = document.getElementById("menuOverlay");
const menuClose = document.getElementById("menuClose");

menuBtn?.addEventListener("click", () => {
  menuOverlay.setAttribute("aria-hidden", "false");
});

menuClose?.addEventListener("click", () => {
  menuOverlay.setAttribute("aria-hidden", "true");
});

// ================= URL MODE ROUTER =================
function initURLMode() {
  const path = window.location.pathname.toLowerCase();

  if (!path.startsWith("/modes/")) return;

  const mode = path.split("/")[2];

  if (MODE_KEYS.includes(mode)) {
    setMode(mode);
    openChat();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initURLMode();
});
document.querySelectorAll(".mode-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    const mode = link.dataset.mode;

    if (mode) {
      history.pushState({}, "", `/modes/${mode}`);
      setMode(mode);
      openChat();
    }
  });
});
window.addEventListener("popstate", () => {
  const path = window.location.pathname.toLowerCase();

  if (!path.startsWith("/modes/")) {
    closeChat();
    return;
  }

  const mode = path.split("/")[2];

  if (MODE_KEYS.includes(mode)) {
    setMode(mode);
    openChat();
  }
});
const MODE_META = {
  default: {
    title: "LeoCore — Fast Free AI Chat",
    desc: "LeoCore gives fast, powerful AI chat with multiple modes. Free. No paywalls."
  },
  study: {
    title: "Study Mode | LeoCore — Learn Better, Faster",
    desc: "LeoCore Study Mode helps you understand topics clearly with explanations, examples, and guidance."
  },
  research: {
    title: "Research Mode | LeoCore — Deep AI Analysis",
    desc: "Structured, factual research responses with depth and clarity."
  },
  deep: {
    title: "Deep Mode | LeoCore — Think Deeper",
    desc: "Long thoughtful reasoning, insights and deep thinking support."
  },
  chill: {
    title: "Chill Mode | LeoCore — Casual AI Chat",
    desc: "Relaxed friendly conversation. Just talk."
  },
  precision: {
    title: "Precision Mode | LeoCore — Short Exact Answers",
    desc: "No fluff. Just direct, precise answers."
  },
  flame: {
    title: "Flame Mode | LeoCore — Creative Powerful AI",
    desc: "Bold, energetic, creative responses."
  }
};
warmBackend();
initHeroTyping();
initModes();