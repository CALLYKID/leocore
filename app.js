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
let selectedImageBase64 = null; // Ensure this is global

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

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
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

/* ================= IMAGE & PREVIEW LOGIC ================= */
const imageUpload = document.getElementById('imageUpload');
const uploadBtn = document.getElementById('uploadBtn');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

function clearImagePreview() {
  selectedImageBase64 = null;
  imagePreview.src = "";
  imagePreviewContainer.classList.add('hidden');
  imageUpload.value = "";
  uploadBtn.style.color = ""; 

  // Check if we should switch back to Mic
  updateButtonState(); 
}


removeImageBtn?.addEventListener('click', clearImagePreview);

uploadBtn?.addEventListener('click', () => {
  imageUpload.click();
});

imageUpload?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = async () => {
    const compressed = await compressImage(reader.result, 1024); 
    selectedImageBase64 = compressed;
    imagePreview.src = compressed;
    imagePreviewContainer.classList.remove('hidden');
    uploadBtn.style.color = "#00ffcc"; 

    // --- ADD THIS TO MORPH THE BUTTON ---
    actionBtn.dataset.state = "send";
    btnIcon.textContent = "➔";
    // ------------------------------------
  };
  reader.readAsDataURL(file);
});



// 3. FIX: Click to Preview (Fullscreen)
function openFullscreenPreview(src) {
  const overlay = document.createElement("div");
  // Inline styles to ensure it works even if CSS is cached
  overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;";
  overlay.innerHTML = `<img src="${src}" style="max-width:95%;max-height:95%;border-radius:8px;box-shadow:0 0 30px rgba(0,0,0,0.5);">`;
  
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
  if (triggerVibe) triggerVibe(5);
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
  // 1. Basic Safety
  let formatted = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  // 2. Bold/Slang emphasis
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 3. Simple line breaks for Gen Z chat style
  formatted = formatted.replace(/\n/g, "<br>");
  
  // 4. Handle Emojis (Optional: wrap in span for scaling)
  return `<div class="p-container">${formatted}</div>`;
}


/* ================ CHAT STORAGE ================= */
const CHAT_STORE_KEY = "leocore_chats_v1";

function loadAllChats() {
  try { return JSON.parse(localStorage.getItem(CHAT_STORE_KEY)) || {}; } catch { return {}; }
}
function saveCurrentChat() {
  const allChats = loadAllChats();
  const messages = [...chatMessages.children]
    .filter(el => (el.classList.contains("user") || el.classList.contains("leocore")) && !el.classList.contains("thinking"))
    .map(el => {
      const isUser = el.classList.contains("user");
      
      // 1. Extract Sources
      const sourceCardLinks = el.querySelectorAll(".source-card");
      let savedSources = null;
      if (sourceCardLinks.length > 0) {
        savedSources = Array.from(sourceCardLinks).map(a => ({
          url: a.href,
          title: a.querySelector(".source-title").textContent,
          favicon: a.querySelector(".source-icon").src
        }));
      }

      // 2. Extract Content (Cleaned)
      let content = "";
      if (isUser) {
        content = el.textContent;
      } else {
        // CLONE the element so we can strip the sources out without affecting the UI
        const tempEl = el.cloneNode(true);
        const sourcesGrid = tempEl.querySelector(".sources-grid");
        const sourcesLabel = tempEl.querySelector(".sources-label");
        
        // Remove the source elements from our temporary copy before saving text
        if (sourcesGrid) sourcesGrid.remove();
        if (sourcesLabel) sourcesLabel.remove();
        
        const textContainer = tempEl.querySelector(".reply-text");
        content = textContainer ? textContainer.innerText.trim() : tempEl.innerText.trim();
      }

      const imgEl = el.querySelector("img:not(.source-icon)");
      return {
        role: isUser ? "user" : "leocore",
        content: content, // This is now JUST the AI's words
        image: imgEl ? imgEl.src : null,
        sources: savedSources 
      };
    });

  allChats[currentMode] = {
    messages: messages,
    updatedAt: Date.now()
  };
  localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(allChats));
}




async function shareChat() {
  const messages = getMemoryForMode(currentMode, 30);
  if (!messages || messages.length === 0) {
    alert("Nothing to share yet, bestie. Send some messages first.");
    return;
  }

  // 1. UI Feedback: Disable button and show loading
  const originalLabel = shareBtn.innerHTML;
  shareBtn.disabled = true;
  shareBtn.innerHTML = "Generating...";

  try {
    // 2. Clean HTML for Sharing (Remove divs and formatting)
    const cleanChat = messages.map(m => ({
      role: m.role,
      content: m.role === "leocore" 
        ? m.content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') 
        : m.content
    }));

    const id = crypto.randomUUID();

    // 3. API Call with Timeout
    const response = await fetch(`${API_URL}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, chat: cleanChat }),
      signal: AbortSignal.timeout(8000) // Don't let it hang forever
    });

    if (!response.ok) throw new Error("Server rejected the share");

    const link = `https://leocore.vercel.app/share/${id}`;

    // 4. Native Share or Clipboard
    if (navigator.share) {
      await navigator.share({
        title: "LeoCore Intelligence Chat",
        text: "Check out this session with LeoCore:",
        url: link
      });
    } else {
      await navigator.clipboard.writeText(link);
      alert("Link copied to clipboard! 🔗");
    }

  } catch (err) {
    // 5. CATCH: Handle failures gracefully
    console.error("Share failed:", err);
    alert("Share failed. The server might be down or your connection is shaky.");
  } finally {
    // 6. FINALLY: Always reset the button state
    shareBtn.disabled = false;
    shareBtn.innerHTML = originalLabel;
  }
}


function restoreChatForMode(mode) {
  const allChats = loadAllChats();
  const data = allChats[mode];
  [...chatMessages.children].forEach(el => { if (!el.id || el.id !== "emptyState") el.remove(); });
  hideEmptyState();
  if (!data || !Array.isArray(data.messages) || data.messages.length === 0) { showEmptyState(); return; }
  data.messages.forEach(msg => renderMessage(msg.content, msg.role, msg.image, msg.sources));
  butteryScroll();
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
  updateCanonicalForMode(key);
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
/* ================= BUTTERY SCROLL LOGIC ================= */
function butteryScroll() {
  const el = chatMessages;
  if (!el || !userLockedScroll) return; // Only scroll if user hasn't scrolled up manually

  // requestAnimationFrame is the "Butter" — it tells the GPU to 
  // sync the scroll with the physical screen refresh
  requestAnimationFrame(() => {
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth' 
    });
  });
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
  reading: [{ title: "Paste the text.", sub: "I'll summarize it, simplify it, or find the hidden meaning." }],
  roast: [{ title: "Ready to get cooked?", sub: "Ask something stupid. I dare you." }]
};

const MODE_SUGGESTIONS = {
  default:   ["Help me with a project", "Give me life advice", "Write a creative caption"],
  study:     ["Explain photosynthesis", "Quiz me on history", "Create a revision plan"],
  research:  ["Latest tech trends", "Deep dive into AI history", "Fact check a rumor"],
  deep:      ["What is consciousness?", "The future of humanity", "Analyze this paradox"],
  chill:     ["Recommend a movie", "Tell me a joke", "What's good on Netflix?"],
  precision: ["Define 'Entropy'", "Convert 50c to F", "Summary of World War 2"],
  roast:     ["Roast my music taste", "Judge my life choices", "Roast this app"],
  reading:   ["Summarize this text", "Explain the tone", "Simplify this paragraph"]
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
    img.className = "chat-img-thumb"; 
    img.onclick = () => openFullscreenPreview(content); 
    el.appendChild(img);
    el.classList.add("image-bubble");
  } else { 
    el.textContent = content; 
  }
  
  chatMessages.appendChild(el);
  // Remove butteryScroll() here if you want ONLY the manual scroll-to-top to work
  return el; // <--- ADD THIS
}



function renderMessage(text, role, imageData = null, savedSources = null) {
  const el = document.createElement("div");
  el.className = `chat-message ${role} no-bubble`;

  // 1. Render Image
  if (imageData) {
    const img = document.createElement("img");
    img.src = imageData;
    img.loading = "lazy"; // Adds that extra layer of butter-smooth scrolling
    img.className = "chat-img-thumb"; 
    img.onclick = () => openFullscreenPreview(imageData); // THIS ENABLES PREVIEW
    el.appendChild(img);
  }


  // 2. Render Sources (Top)
  if (savedSources && savedSources.length > 0) {
    const sourceContainer = document.createElement("div");
    sourceContainer.className = "sources-container-wrapper"; // Helpful for CSS targeting
    
    const cardsHtml = savedSources.map(s => {
      let domain = "Link";
      try { domain = new URL(s.url).hostname.replace('www.', ''); } catch(e) {}
      return `
        <a href="${s.url}" target="_blank" class="source-card">
          <div class="source-header">
            <img src="${s.favicon}" class="source-icon">
            <span class="source-site">${domain}</span>
          </div>
          <span class="source-title">${s.title}</span>
        </a>`;
    }).join('');

    sourceContainer.innerHTML = `
      <div class="sources-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        Sources Found
      </div>
      <div class="sources-grid">${cardsHtml}</div>
    `;
    el.appendChild(sourceContainer);
  }

  // 3. Render Text (Bottom)
  if (text && text.trim().length > 0) {
    const textContainer = document.createElement("div");
    textContainer.className = role === "leocore" ? "reply-text" : "";
    if (role === "leocore") {
      textContainer.innerHTML = formatLeoReply(text);
    } else {
      textContainer.textContent = text;
    }
    el.appendChild(textContainer);
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
  butteryScroll();
  return el;
}

function setStreamingState(on) {
  const isBusy = on || isStreaming || isDisplaying;
  
  if (isBusy) {
    // Hide Mic/Send, Show Stop
    actionBtn?.classList.add("hidden"); 
    stopBtn?.classList.remove("hidden"); 
  } else {
    // Show Mic/Send, Hide Stop
    stopBtn?.classList.add("hidden");
    actionBtn?.classList.remove("hidden");
    
    // Safety check: Ensure the form itself is visible
    chatForm.style.display = "flex"; 

    // Refresh the icon based on whether the user typed something
    if (chatInput.value.trim().length > 0 || selectedImageBase64 !== null) {
        actionBtn.dataset.state = "send";
        btnIcon.textContent = "➔";
    } else {
        actionBtn.dataset.state = "mic";
        btnIcon.textContent = "၊၊||၊";
    }
  }
}




stopBtn.addEventListener("click", () => {
  // If nothing is happening, don't do anything
  if (!isStreaming && !isDisplaying) return;
  
  stopRequested = true;
  
  // 1. Kill the network request
  if (controller) controller.abort();
  
  // 2. Clear the typing queue
  wordQueue = []; 
  
  // 3. Force clean state
  isStreaming = false; 
  isDisplaying = false;
  
  setStreamingState(false);
  saveCurrentChat();
  butteryScroll();
});

function createThinkingMessage() {
  hideEmptyState();
  const el = document.createElement("div");
  el.className = "chat-message leocore thinking leo-thinking-standalone";
  el.innerHTML = `<div class="leo-thinking-orbit"><div class="leo-core">L</div><div class="orbit"></div></div>`;
  chatMessages.appendChild(el);
  butteryScroll();
  return el;
}

/* ================= REFINED SENDING LOGIC ================= */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  
  const needsSearch = currentMode !== 'vision'; 
  if (needsSearch) {
    webIndicator.classList.remove("hidden");
    webIndicator.textContent = "Checking facts...";
  }

  const currentImageToProcess = selectedImageBase64;
  if ((!text && !selectedImageBase64) || isStreaming || isDisplaying) return;
  
  stopRequested = false;
  streamBuffer = ""; 
  wordQueue = []; 
  isStreaming = true; 
  
  setStreamingState(true);
  
  // --- UPDATED SCROLL LOGIC ---
  let userMsgEl;
  if (text) userMsgEl = addMessage(text, "user");
  if (currentImageToProcess) userMsgEl = addMessage(currentImageToProcess, "user", true);
  
setTimeout(() => {
  if (userMsgEl) {
    userMsgEl.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start'
    });
  }
}, 50);

  chatInput.value = ""; 
  chatInput.style.height = "auto";
  clearImagePreview();
  
  let thinkingEl = createThinkingMessage();

  try {
    controller = new AbortController();
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ 
        message: text, 
        mode: currentMode, 
        userId: USER_ID, 
        memory: getMemoryForMode(currentMode, MEMORY_LIMIT), 
        image: currentImageToProcess 
      })
    });

    if (!response.ok) throw new Error("Server error");

    const data = await response.json(); 
    
    isStreaming = false;
    
    if (thinkingEl) thinkingEl.remove();
    
    
  
        // Render Professional Sources
    if (data.sources && data.sources.length > 0) {
      const sourceEl = document.createElement("div");
      sourceEl.className = "chat-message leocore no-bubble sources-container";
      
      const cardsHtml = data.sources.map(s => {
        let domain = "Link";
        try { domain = new URL(s.url).hostname.replace('www.', ''); } catch(e) {}
        
        // Use a reliable favicon service (Google or DuckDuckGo)
        const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;

        return `
          <a href="${s.url}" target="_blank" class="source-card">
            <div class="source-header">
              <img src="${iconUrl}" class="source-icon" loading="lazy" 
                   onerror="this.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='">
              <span class="source-site">${domain}</span>
            </div>
            <span class="source-title">${s.title}</span>
          </a>`;
      }).join('');

      sourceEl.innerHTML = `
        <div class="sources-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          Sources Found
        </div>
        <div class="sources-grid">${cardsHtml}</div>
      `;
      
      chatMessages.appendChild(sourceEl);
      if (triggerVibe) triggerVibe(5); // Light "click" when sources pop in

      if (userLockedScroll) butteryScroll();
    }


    // Setup Streaming Block
    const leoBubble = createLeoStreamingBlock();
    const textEl = leoBubble.querySelector(".reply-text");
    
    streamBuffer = data.text; 
    wordQueue.push(data.text); 
    processQueue(textEl);
    
    
  } catch (err) {
    isStreaming = false;
    if (thinkingEl) thinkingEl.remove();
    
    // If we aborted manually, don't show an error message
    if (err.name !== 'AbortError' && !stopRequested) {
      addMessage("Connection lost. Tap to retry.", "leocore");
    }
    setStreamingState(false);
  }
});   



/* ================= FREE-SCROLL STREAMING ENGINE ================= */
async function processQueue(textEl) {
  if (isDisplaying) return;
  isDisplaying = true;
  
  let displayedBuffer = "";
  const textNode = document.createTextNode("");
  textEl.innerHTML = ""; 
  textEl.appendChild(textNode);

  try {
    while (wordQueue.length > 0) {
      if (stopRequested) break;
      const currentChunk = wordQueue.shift();
      const delay = wordQueue.length > 50 ? 2 : 10; // Dynamic speed
      const parts = currentChunk.split(/(\s+)/);
      
      for (let part of parts) {
        if (stopRequested) break;
        displayedBuffer += part;
        
        // Update content WITHOUT forcing a scroll
        textNode.nodeValue = displayedBuffer;
        
        await new Promise(r => setTimeout(r, delay));
      }
    }
  } finally {
    isDisplaying = false;
    if (!isStreaming) setStreamingState(false);
    
    if (textEl && !stopRequested) {
        textEl.innerHTML = formatLeoReply(streamBuffer);
    }
    // No more snapping to bottom here!
    saveCurrentChat();
  }
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

  // SAFE CHECK: This prevents the "null" error if the menu is closed or missing
  if (fill && text) { 
    fill.style.width = percent + "%"; 
    text.textContent = percent + "%"; 
    fill.style.background = percent > 80 ? "#ff4d4d" : "#00ffcc"; 
  }
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

function updateCanonicalForMode(mode) {
  let canonical = document.querySelector("link[rel='canonical']");
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${location.origin}/modes/${mode}`;
}
const MODE_META = {
  default: {
    title: "LeoCore — Fast Free AI Chat",
    desc: "LeoCore is a fast, free AI chat platform with multiple intelligent modes for everyday use."
  },
  study: {
    title: "Study Mode AI | LeoCore",
    desc: "Study Mode on LeoCore helps students learn faster with clear explanations, examples, and structured answers."
  },
  research: {
    title: "Research AI Chat | LeoCore",
    desc: "LeoCore Research Mode provides structured, factual, and in-depth AI-powered analysis for serious research."
  },
  reading: {
    title: "Reading & Summarization AI | LeoCore",
    desc: "Use LeoCore Reading Mode to summarize, simplify, and analyze text instantly."
  },
  deep: {
    title: "Deep Thinking AI | LeoCore",
    desc: "LeoCore Deep Mode explores complex ideas with long-form reasoning and thoughtful insights."
  },
  precision: {
    title: "Precision AI Answers | LeoCore",
    desc: "LeoCore Precision Mode delivers short, exact, no-fluff AI answers."
  },
  chill: {
    title: "Casual AI Chat | LeoCore",
    desc: "Chat casually with LeoCore in Chill Mode for relaxed, friendly AI conversations."
  },
  roast: {
    title: "Roast Mode AI | LeoCore",
    desc: "Get brutally honest, sarcastic, and savage AI responses with LeoCore Roast Mode."
  }
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

/* ================= SHARE BUTTON INITIALIZATION ================= */
document.getElementById("shareBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  headerDropdown.classList.add("hidden"); // Close the menu
  shareChat(); // Trigger the logic
});

/* ================= STARTUP ================= */
async function initApp() {
  const splash = document.getElementById("splashScreen");
  const log = document.getElementById("boot-log");
  const fill = document.getElementById("load-fill");
  
  const sequence = [
    { t: "Establishing Neural Link", p: "100%" },
    { t: "Completed", p: "100%" }
  ];

  initIntentStrip();
  initModes(); 
  warmBackend();

  // SAFE CHECK: Only run the animation if the progress bar exists
  if (log && fill) {
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
        splash.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
        splash.style.opacity = "0";
        splash.style.transform = "scale(1.05)"; 
        setTimeout(() => splash.style.display = "none", 800);
      }
    }, 500); 
  } else if (splash) {
    // FALLBACK: If logs are missing, just hide the splash screen so the site works
    splash.style.display = "none";
  }
}

function updateMicUI(active) {
  const btn = document.getElementById('micBtn');
  if (active) {
    btn.classList.add('active');
    document.body.classList.add('is-listening');
  } else {
    btn.classList.remove('active');
    document.body.classList.remove('is-listening');
  }
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

/* ================= ACTION BUTTON CONTROLLER ================= */
const actionBtn = document.getElementById("actionBtn");
const btnIcon = document.getElementById("btnIcon");

// 1. Morph Button on Typing OR Image Selection
const updateButtonState = () => {
    if (isVoiceActive || isStreaming || isDisplaying) return;

    // Check if there is text OR an image selected
    const hasContent = chatInput.value.trim().length > 0 || selectedImageBase64 !== null;

    if (hasContent) {
        actionBtn.dataset.state = "send";
        btnIcon.textContent = "➔";
    } else {
        actionBtn.dataset.state = "mic";
        btnIcon.textContent = "၊၊||၊";
    }
};

// Listen for typing
chatInput.addEventListener("input", updateButtonState);


// 2. Logic for Clicking the Action Button
actionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents double-triggering

    if (actionBtn.dataset.state === "send") {
        chatForm.requestSubmit(); // Standard way to trigger form submit
    } else {
        toggleVoice();
    }
});
function stopVoice() {
    if (recognition) {
        recognition.stop();
        console.log("Voice recognition stopped.");
    }
}


/* ================= VOICE STREAMING ENGINE ================= */
let recognition = null;
let isVoiceActive = false;

function toggleVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Microphone not supported on this browser.");

    if (isVoiceActive) {
        stopVoiceAndSubmit();
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
    isVoiceActive = true;
    document.body.classList.add('is-listening');
    actionBtn.dataset.state = "recording"; // Sets the CSS state
    btnIcon.textContent = "🛑"; // Icon change
    if (typeof triggerVibe === "function") triggerVibe(15);
};

    recognition.onresult = (event) => {
    let final_transcript = "";
    let interim_transcript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
        } else {
            interim_transcript += event.results[i][0].transcript;
        }
    }
    
    // Update the input field with the final text plus what it's still hearing
    chatInput.value = final_transcript || interim_transcript;
    
    // Auto-expand the textarea
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';

    // Morph the icon to "Send" since there is now text
    actionBtn.dataset.state = "send";
    btnIcon.textContent = "➔";
};

    recognition.onerror = () => stopVoice();
    recognition.onend = () => {
    isVoiceActive = false;
    document.body.classList.remove('is-listening');
    // Important: Clean up the data-state
    if (chatInput.value.trim().length > 0) {
        actionBtn.dataset.state = "send";
        btnIcon.textContent = "➔";
    } else {
        actionBtn.dataset.state = "mic";
        btnIcon.textContent = "၊၊||၊";
    }
};

    recognition.start();
}

function stopVoiceAndSubmit() {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    
    // Crucial: Give the DOM 100ms to register the final transcript 
    // and then trigger the send logic
    setTimeout(() => {
        if (chatInput.value.trim().length > 0) {
            chatForm.requestSubmit();

        } else {
            // If empty, just reset the icon
            actionBtn.dataset.state = "mic";
            btnIcon.textContent = "၊၊||၊";
        }
    }, 150);
}






initApp();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('LeoCore PWA: Active'))
      .catch(err => console.log('LeoCore PWA: Failed', err));
  });
}
/* ================= UNIVERSAL INSTALL ENGINE ================= */
const pwaBtn = document.getElementById('pwaInstallBtn');
const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
let deferredPrompt;

/**
 * 1. Initialize Visibility
 * On Android, we stay hidden until the browser fires the event.
 * On iOS, we force show the button because Safari doesn't have an event.
 */
function initInstallVisibility() {
  if (isStandalone) return; // Don't show if already installed

  if (isIos) {
    pwaBtn?.classList.remove('hidden');
    // Optional: Change text for iPhone users
    const label = pwaBtn?.querySelector('.main-label');
    if (label) label.textContent = "Install LeoCore";
  }
}

/**
 * 2. Android/Chrome specific event
 */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Reveal button for Android
  if (pwaBtn) pwaBtn.classList.remove('hidden');
});

/**
 * 3. Handling the "Wanna Touch" Click
 */
pwaBtn?.addEventListener('click', async () => {
  if (typeof triggerVibe === "function") triggerVibe(15);

  if (isIos) {
    // iPhone doesn't support direct install, show the sexy sheet
    showIosInstallSheet();
  } else if (deferredPrompt) {
    // Android direct install
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      pwaBtn.classList.add('hidden');
    }
    deferredPrompt = null;
  }
});

/**
 * 4. The Sexy iOS Sheet
 */
function showIosInstallSheet() {
  // Check if sheet already exists to prevent duplicates
  if (document.querySelector('.ios-install-sheet')) return;

  const sheet = document.createElement('div');
  sheet.className = 'ios-install-sheet';
  sheet.innerHTML = `
    <div class="sheet-content">
      <div class="sheet-bar"></div>
      <div class="sheet-header">Install LeoCore</div>
      <div class="sheet-body">
        <div class="step">
          <span class="step-num">1</span>
          <p>Tap the <strong>Share</strong> icon in Safari <span class="ios-share-icon">⎋</span></p>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <p>Scroll and select <strong>'Add to Home Screen'</strong></p>
        </div>
      </div>
      <button class="sheet-close-btn" onclick="this.closest('.ios-install-sheet').classList.add('hide'); setTimeout(()=>this.closest('.ios-install-sheet').remove(), 300)">Got it</button>
    </div>
  `;
  document.body.appendChild(sheet);
  
  // Trigger animation
  setTimeout(() => sheet.classList.add('show'), 10);
}

// Run visibility check on startup
initInstallVisibility();

// Hide button if app is installed successfully
window.addEventListener('appinstalled', () => {
  pwaBtn?.classList.add('hidden');
  deferredPrompt = null;
});
/* ================= KEYBOARD SHORTCUTS ================= */
chatInput.addEventListener("keydown", (e) => {
  // Check if "Enter" is pressed WITHOUT the "Shift" key
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // Prevent adding a new line in the textarea

    // Only trigger if there is actual content or an image
    const hasContent = chatInput.value.trim().length > 0 || selectedImageBase64 !== null;
    
    if (hasContent && !isStreaming && !isDisplaying) {
      if (triggerVibe) triggerVibe(10); // Haptic feedback for the keypress
      chatForm.requestSubmit(); // Trigger the form submission logic
    }
  }
});

