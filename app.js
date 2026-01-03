/* ===========================================================
   LEOCORE APP.JS — FINAL STABLE BUILD (REFINED)
============================================================ */

/* ================= GLOBAL STATE ================= */
let isStreaming = false;
let stopRequested = false;
let controller = null;
let userLockedScroll = true;
let rafScroll = null;
const MEMORY_LIMIT = 8;
let userPowerSave = false;
let streamBuffer = "";
let wordQueue = []; 
let isDisplaying = false; 

window.addEventListener("beforeunload", () => {
  saveCurrentChat();
});

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
    return data || { joined: Date.now(), messagesSent: 0, streak: 0 };
  } catch {
    return { joined: Date.now(), messagesSent: 0, streak: 0 };
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
  document.documentElement.style.setProperty("--vh", window.innerHeight * 0.01 + "px");
}
setVh();
window.addEventListener("resize", setVh);
window.addEventListener("orientationchange", setVh);

/* ================= BACKEND WARM ================= */
async function warmBackend() {
  try { await fetch(`${API_URL}/ping`, { method: "GET", cache: "no-store" }); } catch {}
}

/* ================= AUTO THERMAL CONTROL ================= */
let thermalSamples = [];
let thermalActive = false;
let lastThermalSwitch = 0;
const THERMAL_COOLDOWN = 4000;

function getFPS(callback) {
  let last = performance.now();
  let frames = 0;
  function frame() {
    const now = performance.now();
    frames++;
    if (now >= last + 1000) { callback(frames); frames = 0; last = now; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function enableThermalMode() {
  if (thermalActive || userPowerSave) return;
  if (!document.body.classList.contains("chat-open")) return;
  thermalActive = true;
  document.body.classList.add("chat-freeze");
  requestAnimationFrame(() => chatMessages.scrollTo({ top: chatMessages.scrollHeight }));
}

function disableThermalMode() {
  if (!thermalActive) return;
  thermalActive = false;
  if (!userPowerSave) document.body.classList.remove("chat-freeze");
  requestAnimationFrame(() => chatMessages.scrollTop = chatMessages.scrollHeight);
}

setTimeout(() => {
  getFPS(fps => {
    thermalSamples.push(fps);
    if (thermalSamples.length > 10) thermalSamples.shift();
    const avg = thermalSamples.reduce((a,b)=>a+b,0) / thermalSamples.length;
    const now = Date.now();
    if (now - lastThermalSwitch < THERMAL_COOLDOWN) return;
    if (avg < 35) { enableThermalMode(); lastThermalSwitch = now; }
    if (avg > 62) { disableThermalMode(); lastThermalSwitch = now; }
  });
}, 3000);

/* ================= IMAGE & SHARE LOGIC ================= */
const imageUpload = document.getElementById('imageUpload');
const uploadBtn = document.getElementById('uploadBtn');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');
const shareBtn = document.getElementById("shareBtn");

let selectedImageBase64 = null;

async function shareChat() {
  const messages = getMemoryForMode(currentMode, 30);
  if (!messages || messages.length === 0) {
    alert("No chat to share.");
    return;
  }

  const id = crypto.randomUUID();

  await fetch(`${API_URL}/api/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, chat: messages })
  });

  const link = `https://leocore.vercel.app/share/${id}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "LeoCore Chat",
        text: "Check out this LeoCore conversation",
        url: link
      });
      return;
    } catch {}
  }

  await navigator.clipboard.writeText(link);
  alert("Share link copied!");
}

shareBtn?.addEventListener("click", shareChat);
uploadBtn?.addEventListener('click', () => imageUpload.click());

imageUpload?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = async () => {
    const compressed = await compressImage(reader.result);
    selectedImageBase64 = compressed;
    imagePreview.src = compressed;
    imagePreviewContainer.classList.remove('hidden');
    uploadBtn.style.color = "#00ffcc"; 
    jumpToBottom(chatMessages);
  };
  reader.readAsDataURL(file);
});

function clearImagePreview() {
  selectedImageBase64 = null;
  imagePreview.src = "";
  imagePreviewContainer.classList.add('hidden');
  imageUpload.value = "";
  uploadBtn.style.color = ""; 
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
  roast: { label: "💀 Roast", desc: "Brutally honest, sarcastic, and judgmental" }
};
const MODE_KEYS = Object.keys(MODE_MAP);

/* ================= DOM REFS ================= */
const chatOverlay  = document.getElementById("chat-overlay");
const chatCloseBtn = document.getElementById("chatCloseBtn");
const chatMessages = document.getElementById("chatMessages");
const webIndicator = document.getElementById("webSearchIndicator");
const leoThinking = document.getElementById("leoThinking");
const chatForm     = document.getElementById("chatForm");
const chatInput    = document.getElementById("chatInput");
const chatMode     = document.getElementById("chatMode");
const chatModeDesc = document.getElementById("chatModeDesc");
const chatClearBtn = document.getElementById("clearChat");
const sendBtn = document.getElementById("sendBtn");
const stopBtn = document.getElementById("stopBtn");
const intentStrip = document.querySelector(".intent-strip");

function showThinking(){ leoThinking.classList.remove("hidden"); requestAnimationFrame(()=>leoThinking.classList.add("show")); }
function hideThinking(){ leoThinking.classList.remove("show"); setTimeout(()=>leoThinking.classList.add("hidden"), 180); }


intentStrip?.addEventListener("click", () => {
  setMode("default");
  history.pushState({}, "", "/modes/default");
  openChat();
});

function formatLeoReply(text) {
  if (!text) return "";
  text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  text = text.replace(/^---$/gm, '<hr class="style-hr">');
  text = text.replace(/^>\s+(.*)$/gm, '<blockquote class="quote-style">$1</blockquote>');
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/`([^`]+)`/g, '<code class="code-style">$1</code>');
  text = text.replace(/^###\s+(.*)$/gm, '<div class="h3-style">$1</div>');
  text = text.replace(/^##\s+(.*)$/gm, '<div class="h2-style">$1</div>');
  let parts = text.split(/\n\n+/).map(p => {
    p = p.trim().replace(/\n/g, "<br>");
    return `<div class="p-container">${p}</div>`;
  });
  return parts.join("");
}

/* ================ CHAT STORAGE ================= */
const CHAT_STORE_KEY = "leocore_chats_v1";

function loadAllChats() {
  try { return JSON.parse(localStorage.getItem(CHAT_STORE_KEY)) || {}; } catch { return {}; }
}

function saveCurrentChat() {
  const allChats = loadAllChats();

  allChats[currentMode] = {
    messages: [...chatMessages.children]
      .filter(el =>
        (el.classList.contains("user") || el.classList.contains("leocore")) &&
        !el.classList.contains("thinking")
      )
      .map(el => {
        const img = el.querySelector("img");
        const role = el.classList.contains("user") ? "user" : "leocore";

        return {
          role,
          content: role === "leocore"
            ? el.innerHTML   // keep full formatted HTML
            : el.textContent, // plain text for user
          image: img ? img.src : null
        };
      }),
    
    updatedAt: Date.now()
  };

  try {
    let serializedData = JSON.stringify(allChats);

    while (serializedData.length > 4000000) {
      let purged = false;

      for (let mode in allChats) {
        if (allChats[mode].messages) {
          for (let msg of allChats[mode].messages) {
            if (msg.image) {
              msg.image = null;
              purged = true;
              break;
            }
          }
        }
        if (purged) break;
      }

      if (!purged) {
        const oldestMode = Object.keys(allChats)
          .sort((a, b) => allChats[a].updatedAt - allChats[b].updatedAt)[0];

        allChats[oldestMode].messages.shift();
      }

      serializedData = JSON.stringify(allChats);
    }

    localStorage.setItem(CHAT_STORE_KEY, serializedData);

  } catch (e) {}
}

function restoreChatForMode(mode) {
  const allChats = loadAllChats();
  const data = allChats[mode];
  [...chatMessages.children].forEach(el => { if (!el.id || el.id !== "emptyState") el.remove(); });
  hideEmptyState();
  if (!data || !Array.isArray(data.messages) || data.messages.length === 0) { showEmptyState(); return; }
  data.messages.forEach(msg => renderMessage(msg.content, msg.role, msg.image));
  jumpToBottom(chatMessages);
}

function getMemoryForMode(mode, limit = 8) {
  const data = loadAllChats()[mode];
  return (data && Array.isArray(data.messages)) ? data.messages.slice(-limit) : [];
}

function clearCurrentModeChat() {
  const allChats = loadAllChats();
  if (allChats[currentMode]) { delete allChats[currentMode]; localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(allChats)); }
  [...chatMessages.children].forEach(el => { if (el.id !== "emptyState") el.remove(); });
  showEmptyState();
}

function compressImage(base64Str, maxWidth = 1024) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = maxWidth / img.width;
      canvas.width = scale < 1 ? maxWidth : img.width;
      canvas.height = scale < 1 ? img.height * scale : img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
}

/* ================= MODES & UI ================= */
function initModes() {
  const path = window.location.pathname.toLowerCase();
  
  // 1. If we are NOT on a mode-specific path, just set default and stay on home
  if (!path.startsWith("/modes/")) {
    setMode("default");
    return;
  }

  // 2. If we ARE on a mode path (e.g., /modes/study)
  const mode = path.split("/")[2];
  if (MODE_KEYS.includes(mode)) {
    setMode(mode);
    
    // 3. THE FIX: Open the chat overlay automatically on load
    requestAnimationFrame(() => {
        openChat();
    });
  } else {
    setMode("default");
  }
}

// THIS WAS THE MISSING PIECE!
function setMode(key) {
  // Save current progress before switching
  if (document.body.classList.contains("chat-open")) saveCurrentChat();
  
  const m = MODE_MAP[key] || MODE_MAP.default;
  currentMode = key;

  // Update Body Class for CSS styling
  document.body.classList.forEach(c => { 
    if (c.startsWith("mode-")) document.body.classList.remove(c); 
  });
  setTimeout(() => document.body.classList.add(`mode-${key}`), 2);

  // Update Header UI
  if (chatMode) chatMode.textContent = m.label;
  if (chatModeDesc) chatModeDesc.textContent = m.desc;

  // Load chat history for this specific mode
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

function openChat() {
  chatOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("chat-open");
  warmBackend();
  if (!hasRealMessages()) showEmptyState();
  requestAnimationFrame(() => {
    chatMessages.scrollTop = (chatMessages.scrollHeight <= chatMessages.clientHeight) ? 0 : chatMessages.scrollHeight;
  });
}

function closeChat() {
  saveCurrentChat();
  chatOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("chat-open");
  if (!userPowerSave) document.body.classList.remove("chat-freeze");
}


/* ================= SCROLL & INPUT ================= */
function isNearBottom(el, threshold = 80) { return el.scrollHeight - el.scrollTop - el.clientHeight < threshold; }
function jumpToBottom(el) { el.scrollTop = el.scrollHeight; }

function forceScrollToBottom() {
  let autoScrollCancel = false;
  const smoothStep = () => {
    if (autoScrollCancel) return;
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
    if (Math.abs(chatMessages.scrollHeight - (chatMessages.scrollTop + chatMessages.clientHeight)) > 4) {
      requestAnimationFrame(smoothStep);
    }
  };
  smoothStep();
}

chatMessages.addEventListener("scroll", () => {
  const distance = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
  userLockedScroll = (distance < 30);
}, { passive: true });

/* ================= EMPTY STATE ================= */
const EMPTY_STATES = {
  default: [{ title: "What are we starting with?", sub: "Say anything — I’ll take it from there." }],
  study: [{ title: "What are we studying today?", sub: "Name the topic — I’ll explain it clearly." }],
  research: [{ title: "What are we analysing?", sub: "I’ll keep it structured and factual." }],
  deep: [{ title: "What do you want to think through?", sub: "Take your time. I’ll go deep with you." }],
  chill: [{ title: "What’s up?", sub: "No pressure — just talk." }],
  precision: [{ title: "What’s the question?", sub: "Short answers. No fluff." }],
  roast: [{ title: "Ready to get cooked?", sub: "Ask something stupid. I dare you." }]
};

const MODE_SUGGESTIONS = {
  default: ["Help me with something", "Explain something to me", "Give me advice"],
  study: ["Explain photosynthesis simply", "Help me revise chemistry"],
  roast: ["ROAST ME", "Judge my music taste"]
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
  return [...chatMessages.children].some(el => el.classList.contains("user") || el.classList.contains("leocore"));
}

/* ================= MESSAGING ================= */
function addMessage(content, type, isImage = false) {
  hideEmptyState();
  const el = document.createElement("div");
  el.className = `chat-message ${type}`;
  if (isImage) {
    const img = document.createElement("img");
    img.src = content;
    img.style.maxWidth = "100px";
    img.style.borderRadius = "12px";
    el.appendChild(img);
    el.classList.add("image-bubble");
  } else { el.textContent = content; }
  chatMessages.appendChild(el);
  if (isNearBottom(chatMessages)) jumpToBottom(chatMessages);
}

function renderMessage(text, role, imageData = null) {
  const el = document.createElement("div");
  el.className = `chat-message ${role}`;
  if (role === "leocore") {
  el.classList.add("no-bubble");
  el.innerHTML = text;   // NO re-formatting
}else {
    if (imageData) {
      const img = document.createElement("img");
      img.src = imageData;
      img.style.width = "120px"; img.style.borderRadius = "8px"; img.style.display = "block";
      img.style.marginBottom = text ? "8px" : "0";
      el.appendChild(img);
    }
    if (text) { const txtSpan = document.createElement("span"); txtSpan.textContent = text; el.appendChild(txtSpan); }
  }
  chatMessages.appendChild(el);
  return el;
}

function createLeoStreamingBlock() {
  hideEmptyState();
  const el = document.createElement("div");
  el.className = "chat-message leocore final-ai streaming no-bubble";
  el.innerHTML = `<div class="reply-text"></div>`;
  chatMessages.appendChild(el);
  jumpToBottom(chatMessages);
  return el;
}

function setStreamingState(on){
  isStreaming = on;
  if(on){ sendBtn.classList.add("hidden"); stopBtn.classList.remove("hidden"); }
  else{ stopBtn.classList.add("hidden"); sendBtn.classList.remove("hidden"); }
}

stopBtn.addEventListener("click", () => {
  if (!isStreaming && !isDisplaying) return;
  stopRequested = true;
  if (controller) controller.abort();
  wordQueue = []; isStreaming = false; isDisplaying = false;
  setStreamingState(false);
  saveCurrentChat();
  forceScrollToBottom();
});

function createThinkingMessage() {
  hideEmptyState();
  const el = document.createElement("div");
  el.className = "chat-message leocore thinking leo-thinking-standalone";
  el.innerHTML = `<div class="leo-thinking-orbit"><div class="leo-core">L</div><div class="orbit"></div></div>`;
  chatMessages.appendChild(el);
  jumpToBottom(chatMessages);
  return el;
}

/* ================= REFINED SENDING LOGIC ================= */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  
  // Custom Command: Reset
  if (text === "/leoreset") {
    localStorage.removeItem(CHAT_STORE_KEY);
    chatMessages.innerHTML = "";
    showEmptyState();
    alert("All chats cleared");
    chatInput.value = "";
    return;
  }
  
  if ((!text && !selectedImageBase64) || isStreaming) return;
  
  // Reset streaming states
  streamBuffer = ""; 
  wordQueue = []; 
  stopRequested = false;
  setStreamingState(true);
  
  // UI: Add User Message
  if (text) addMessage(text, "user");
  if (selectedImageBase64) addMessage(selectedImageBase64, "user", true);

  chatInput.value = ""; 
  chatInput.style.height = "auto";
  
  let thinkingEl = createThinkingMessage();

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: text, 
        mode: currentMode, 
        userId: USER_ID, 
        memory: getMemoryForMode(currentMode, MEMORY_LIMIT), 
        profile: loadProfile(), 
        image: selectedImageBase64 
      })
    });

    const data = await response.json(); // Wait for full JSON payload
    if (thinkingEl) thinkingEl.remove();
    clearImagePreview();

    // 1. Render Sources First (If in Research/Study mode)
    if (data.sources && data.sources.length > 0) {
      const sourceEl = document.createElement("div");
      sourceEl.className = "chat-message leocore no-bubble";
      sourceEl.innerHTML = `
        <div class="sources-container">
          ${data.sources.map(s => `
            <a href="${s.url}" target="_blank" class="source-card">
              <div class="source-title">${s.title}</div>
              <div class="source-meta">
                <img src="${s.favicon}" class="source-icon">
                <span>${new URL(s.url).hostname.replace('www.', '')}</span>
              </div>
            </a>
          `).join('')}
        </div>`;
      chatMessages.appendChild(sourceEl);
    }

    // 2. Setup Typewriter for the AI Text
    const leoBubble = createLeoStreamingBlock();
    const textEl = leoBubble.querySelector(".reply-text");
    
    // Feed the wordQueue to maintain the "live" typing feel
    streamBuffer = data.text; 
    wordQueue.push(data.text); 
    processQueue(textEl);
    
  } catch (err) {
    if (thinkingEl) thinkingEl.remove();
    addMessage("Connection lost. Please try again.", "leocore");
    setStreamingState(false);
  } finally {
    isStreaming = false;
  }
});


async function processQueue(textEl) {
  if (isDisplaying) return;
  isDisplaying = true;
  let displayedBuffer = "";
  while (wordQueue.length > 0 || isStreaming) {
    if (stopRequested) break;
    if (wordQueue.length > 0) {
      const parts = wordQueue.shift().split(/(\s+)/);
      for (let part of parts) {
        if (stopRequested) break;
        displayedBuffer += part;
        if (textEl) textEl.innerHTML = formatLeoReply(displayedBuffer);
        if (userLockedScroll) jumpToBottom(chatMessages);
        await new Promise(r => setTimeout(r, 15));
      }
    } else { await new Promise(r => setTimeout(r, 20)); }
  }
  isDisplaying = false; setStreamingState(false);
  if (textEl && !stopRequested) textEl.innerHTML = formatLeoReply(streamBuffer);
}

/* ================= INTENT & MENU (FINAL) ================= */
function initIntentStrip() {
  const words = document.querySelectorAll(".intent-word");
  if (!words.length) return;
  let index = 0; words[index].classList.add("active");
  setInterval(() => {
    words[index].classList.remove("active");
    index = (index + 1) % words.length;
    words[index].classList.add("active");
  }, 2200);
}

const menuBtn = document.getElementById("menuBtn");
const menuOverlay = document.getElementById("menuOverlay");
const menuClose = document.getElementById("menuClose");

function updateStorageMeter() {
  const data = localStorage.getItem(CHAT_STORE_KEY) || "";
  const used = data.length;
  const limit = 5000000;
  const percent = Math.min((used / limit) * 100, 100).toFixed(1);
  const fill = document.getElementById("storageBarFill");
  const text = document.getElementById("storagePercent");
  if (fill && text) { fill.style.width = percent + "%"; text.textContent = percent + "%"; fill.style.background = percent > 80 ? "#ff4d4d" : "#00ffcc"; }
}

menuBtn?.addEventListener("click", () => { menuOverlay.setAttribute("aria-hidden", "false"); updateStorageMeter(); });
menuClose?.addEventListener("click", () => menuOverlay.setAttribute("aria-hidden", "true"));

document.querySelectorAll(".mode-card").forEach(card => {
  const mode = card.dataset.mode;
  card.addEventListener("click", (e) => {
    if (e.target.closest(".mode-toggle")) {
      document.querySelectorAll(".mode-card").forEach(c => { if (c !== card) c.classList.remove("active"); });
      card.classList.toggle("active");
      return;
    }
    setMode(mode || "default");
    history.pushState({}, "", `/modes/${mode}`);
    openChat();
  });
});

chatCloseBtn.addEventListener("click", () => { history.pushState({}, "", "/"); closeChat(); });

window.addEventListener("popstate", () => {
  const path = window.location.pathname.toLowerCase();
  if (!path.startsWith("/modes/")) { closeChat(); return; }
  const mode = path.split("/")[2];
  if (MODE_KEYS.includes(mode)) { setMode(mode); openChat(); }
});

const MODE_META = {
  default: { title: "LeoCore — Fast Free AI Chat", desc: "LeoCore gives fast, powerful AI chat with multiple modes." },
  roast: { title: "Roast Mode | LeoCore", desc: "Get cooked by AI." }
};


/* ================= HEADER DROPDOWN ================= */
const menuDots = document.getElementById("menuDots");
const headerDropdown = document.getElementById("headerDropdown");

menuDots?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpening = headerDropdown.classList.contains("hidden");
  headerDropdown.classList.toggle("hidden");
  if (isOpening && triggerVibe) triggerVibe(8);
});

// Close when clicking outside or scrolling chat
document.addEventListener("click", (e) => {
  if (headerDropdown && !headerDropdown.contains(e.target)) {
    headerDropdown.classList.add("hidden");
  }
});

chatMessages?.addEventListener("scroll", () => {
  headerDropdown?.classList.add("hidden");
}, { passive: true });

/* ================= CUSTOM CONFIRMATION MODAL ================= */
const clearModal = document.getElementById("customConfirm");
const cancelBtn = document.getElementById("cancelClear");
const confirmBtn = document.getElementById("confirmClear");

// Replacing the old project-style chatClearBtn listener
// Ensure your dropdown 'Clear' button has the ID 'clearChat'
document.getElementById("clearChat")?.addEventListener("click", (e) => {
  e.preventDefault();
  clearModal.classList.remove("hidden");
  headerDropdown.classList.add("hidden"); // Close the menu
  if (triggerVibe) triggerVibe(15);
});

cancelBtn?.addEventListener("click", () => {
  clearModal.classList.add("hidden");
});

confirmBtn?.addEventListener("click", () => {
  clearCurrentModeChat(); // Your existing wipe function
  clearModal.classList.add("hidden");
  // Optional: Add a haptic double-tap for success
  if (triggerVibe) triggerVibe([10, 50, 10]); 
});



/* ================= STARTUP ================= */


/* ================= BATTERY MODE TOGGLE FIX ================= */
// Match the ID "lowPowerToggle" from your HTML
const lpBtn = document.getElementById("lowPowerToggle"); 
const lpStatus = document.getElementById("lpStatus");

lpBtn?.addEventListener("click", () => {
  // 1. Flip the state logic
  userPowerSave = !userPowerSave;
  
  // 2. Update the text in the menu
  if (lpStatus) lpStatus.textContent = userPowerSave ? "ON" : "OFF";
  
  // 3. Apply the visual freeze & save to memory
  if (userPowerSave) {
    document.body.classList.add("chat-freeze");
    localStorage.setItem("lpMode", "1");
  } else {
    document.body.classList.remove("chat-freeze");
    localStorage.setItem("lpMode", "0");
  }
});

/* ================= GLOBAL SYSTEM WIPE ================= */
const globalWipeBtn = document.getElementById("globalWipeBtn");

globalWipeBtn?.addEventListener("click", () => {
  const modalTitle = clearModal.querySelector("h3");
  const modalDesc = clearModal.querySelector("p");
  const modalConfirm = document.getElementById("confirmClear");

  // 1. Change modal to "System Reset" style
  modalTitle.textContent = "Nuke All Data?";
  modalDesc.textContent = "This will wipe every chat, your profile, and all settings. It's like you were never here.";
  modalConfirm.textContent = "CONFIRM WIPE";
  modalConfirm.classList.add("glow-pulse");

  // 2. Open Modal and close Sidebar
  clearModal.classList.remove("hidden");
  menuOverlay.setAttribute("aria-hidden", "true");

  // 3. One-time Global Action
  modalConfirm.onclick = () => {
    if (triggerVibe) triggerVibe([50, 50, 50, 50, 200]);
    localStorage.clear();
    location.reload();
  };

  if (triggerVibe) triggerVibe(30);
});

// Reset the modal back to "Chat Clear" mode when cancelled
cancelBtn?.addEventListener("click", () => {
  const modalConfirm = document.getElementById("confirmClear");
  modalConfirm.classList.remove("glow-pulse");
  modalConfirm.onclick = null; // Let the original chat-clear logic take over
  
  // Reset texts back to default
  clearModal.querySelector("h3").textContent = "Clear Conversation?";
  clearModal.querySelector("p").textContent = "This will permanently wipe the chat history for this mode.";
  modalConfirm.textContent = "Wipe Chat";
});

/* ================= STARTUP ================= */
async function initApp() {
  const splash = document.getElementById("splashScreen");
  const log = document.getElementById("boot-log");
  const fill = document.getElementById("load-fill");
  
  // High-end user messaging
  const sequence = [
    { t: "Establishing Neural Link", p: "100%" },
    { t: "Completed", p: "100%" }
  ];

userPowerSave = localStorage.getItem("lpMode") === "1";
if (userPowerSave) document.body.classList.add("chat-freeze");
const lp = document.getElementById("lpStatus");
if (lp) lp.textContent = userPowerSave ? "ON" : "OFF";

  // Run your existing backend/UI logic
  initIntentStrip();
  initHeroTyping();
  initModes(); 
  warmBackend();

  let step = 0;
  const timer = setInterval(() => {
    if (step < sequence.length) {
      log.textContent = sequence[step].t;
      fill.style.width = sequence[step].p;
      step++;
    }
  }, 400);

  setTimeout(() => {
    clearInterval(timer);
    if (splash) {
      // THE "NATIVE" TRANSITION: Scale up slightly and fade
      splash.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
      splash.style.opacity = "0";
      splash.style.transform = "scale(1.05)"; 
      
      setTimeout(() => splash.style.display = "none", 800);
    }
    if (triggerVibe) triggerVibe(10); 
  }, 500); 
}

/* ================= HAPTICS HELPER ================= */
function triggerVibe(ms) {
  try {
    // Check if the browser supports it and if we aren't in power save
    if (navigator.vibrate && !userPowerSave) {
      navigator.vibrate(ms);
    }
  } catch (err) {
    // Silently catch security/permission blocks from Googlebot/Browsers
  }
}

initApp();
