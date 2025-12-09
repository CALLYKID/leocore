/* ============================================================
   GLOBAL RESET / TOUCH FIXES
============================================================ */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent !important;
}

body {
    background: #000;
    font-family: 'Inter', sans-serif;
    color: #fff;
    overflow-x: hidden;
    position: relative;
}


/* Buttons always clickable */
button, .clear-btn, .back-btn, #sendBtn {
    outline: none !important;
    pointer-events: auto !important;
    z-index: 999999;
}


/* ============================================================
   BACKGROUND ELEMENTS — TRUE STATIC LAYER
============================================================ */
#bgLayer {
    position: fixed;
    inset: 0;
    z-index: -10 !important;
    overflow: hidden;
    pointer-events: none !important;
}

#bgVideo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transform: scale(1.05);
    filter: brightness(0.78) saturate(1.2);
}

.overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 10, 35, 0.55);
    backdrop-filter: blur(3px);
}

.bg-soft-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 40% 30%, rgba(0,234,255,0.20), transparent 60%);
    mix-blend-mode: screen;
    animation: softGlow 12s ease-in-out infinite;
}

@keyframes softGlow {
    0% { opacity: 0.55; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(1.08); }
    100% { opacity: 0.55; transform: scale(1); }
}


/* ============================================================
   HERO SECTION
============================================================ */
.center-wrapper {
    text-align: center;
    padding-top: 12vh;
    padding-bottom: 2vh;
    position: relative;
    z-index: 5 !important;
    pointer-events: none;
}

.fake-input {
    pointer-events: auto !important;
    width: 85vw;
    max-width: 600px;
    height: 64px;
    margin: 0 auto 22px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 15, 30, 0.35);
    border-radius: 18px;
    border: 2px solid #00eaff;
    box-shadow: 0 0 24px #00eaff88;
    cursor: pointer;
}

.fake-text {
    font-size: 20px;
    color: #dffaff;
    white-space: nowrap;
}

.main-title {
    font-size: 46px;
    font-weight: 800;
    position: relative;
}

.main-title::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(75deg, transparent, rgba(255,255,255,0.45), transparent);
    transform: translateX(-130%);
    animation: shine 5s infinite;
}

@keyframes shine {
    0% { transform: translateX(-130%); }
    55% { transform: translateX(130%); }
    100% { transform: translateX(130%); }
}

.subtitle {
    margin-top: 8px;
    font-size: 18px;
    color: #e2fbff;
}


/* Fade-in */
.fade-in {
    opacity: 0;
    transform: translateY(8px);
    animation: fadeInReal 0.8s ease-out forwards;
}

@keyframes fadeInReal {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}


/* ============================================================
   SECTION TITLES
============================================================ */
.section-title {
    text-align: center;
    font-size: 22px;
    margin-bottom: 14px;
    font-weight: 700;
    color: #dffaff;
    position: relative;
    z-index: 20;
}


/* Clickable homepage items */
.modes-wrapper,
.tools-wrapper,
.creator-card,
.testimonials,
.info-card,
.mode-selector,
.tool-btn,
.mode-btn {
    position: relative;
    z-index: 30 !important;
    pointer-events: auto !important;
}


/* ============================================================
   MODE BUTTONS
============================================================ */
.modes-wrapper {
    margin-top: 32px;
    padding: 22px 0;
}

.mode-selector {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
    padding: 0 24px;
}

.mode-btn {
    padding: 22px;
    border-radius: 18px;
    background: rgba(255,255,255,0.08);
    border: 2px solid rgba(255,255,255,0.18);
    backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    transition: 0.25s;
    color: #dffaff;
}

.mode-btn.active {
    background: rgba(255,255,255,0.15);
    border-color: var(--theme-glow);
    box-shadow: 0 0 25px var(--theme-glow);
}

.mode-badge {
    font-size: 12px;
    padding: 4px 10px;
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    margin-left: 8px;
    border: 1px solid var(--theme-glow);
    color: var(--theme-glow);
}


/* ============================================================
   QUICK TOOLS
============================================================ */
.tools-wrapper {
    margin-top: 32px;
    padding: 18px 0;
}

.tools-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding: 0 22px;
}

.tool-btn {
    padding: 16px;
    border-radius: 18px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(0,255,255,0.25);
    backdrop-filter: blur(6px);
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s ease;
}

.tool-btn:active {
    transform: scale(0.95);
}


/* ============================================================
   CREATOR CARD
============================================================ */
.creator-card {
    width: 85%;
    margin: 42px auto 24px;
    padding: 24px;
    border-radius: 20px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    backdrop-filter: blur(12px);
    text-align: center;
    font-size: 16px;
    color: #eafaff;
}


/* ============================================================
   TESTIMONIALS
============================================================ */
.testimonials {
    margin-top: 32px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
}

.testimonial-bubble {
    padding: 14px 20px;
    background: rgba(0,200,255,0.15);
    border-radius: 18px;
    font-size: 14px;
    color: #dffaff;
}


/* ============================================================
   INFO CARD
============================================================ */
.info-card {
    width: 90%;
    margin: 40px auto;
    padding: 26px;
    border-radius: 20px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.18);
    backdrop-filter: blur(12px);
    color: #dffaff;
    font-size: 17px;
}


/* ============================================================
   CHAT SCREEN — FIXED OVERLAY + PATCHED ALIGNMENT
============================================================ */
#chatScreen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;

    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(32px) saturate(1.3);

    display: flex;
    flex-direction: column;

    overflow: hidden;
    opacity: 0;
    transform: translateY(40px);
    transition: opacity 0.35s ease, transform 0.35s ease;

    z-index: 999999 !important;
    pointer-events: none;
}

#chatScreen.active {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}


/* Chat wallpaper */
#chatScreen::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url("waves-blur.jpg?v=9999") center/cover no-repeat;
    filter: blur(26px) brightness(0.72) saturate(1.25);
    opacity: 1;
    z-index: -1;
}


/* ============================================================
   CHAT HEADER
============================================================ */
.chat-header {
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0,0,0,0.35);
    border-bottom: 1px solid rgba(0,255,255,0.12);
}

.back-btn,
.clear-btn {
    background: rgba(0,0,0,0.25);
    padding: 8px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.18);
    color: #dffaff;
    font-size: 18px;
    cursor: pointer;
    backdrop-filter: blur(6px);
}

.back-btn:active,
.clear-btn:active {
    transform: scale(0.92);
}

.chat-title-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
}

.chat-title {
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(90deg, #00eaff, #9d4bff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}


/* ============================================================
   CHAT MESSAGES — FULL PATCH
============================================================ */
.chat-messages {
    flex: 1;
    min-height: 0;
    max-height: calc(100vh - 140px);
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    overflow-y: auto;
    background: rgba(0,0,0,0.22);
    backdrop-filter: blur(6px);
}

.user-msg,
.ai-msg {
    width: 100%;
    display: flex;
}

.user-msg {
    justify-content: flex-end;
}

.ai-msg {
    justify-content: flex-start;
}

.bubble {
    padding: 14px 18px;
    border-radius: 14px;
    max-width: 85%;
    word-break: break-word;
    line-height: 1.45;
}

.user-msg .bubble {
    background: #008cff;
    color: #fff;
}

.ai-msg .bubble {
    background: #1e263f;
    color: #e9f4ff;
}


/* ============================================================
   STREAMING EFFECT
============================================================ */
.ai-streaming .stream-text {
    animation: fadeInText 0.2s ease;
}

@keyframes fadeInText {
    from { opacity: 0; }
    to { opacity: 1; }
}


.neon-cursor {
    width: 6px;
    height: 18px;
    background: var(--theme-glow);
    animation: blink 0.7s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}


/* ============================================================
   INPUT BAR (PATCHED)
============================================================ */
.chat-input-area {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: rgba(0,0,0,0.40);
    border-top: 1px solid rgba(255,255,255,0.12);
    flex-shrink: 0;
    position: relative;
    z-index: 99;
}

.chat-input-area input {
    flex: 1;
    height: 46px;
    padding: 0 14px;
    background: rgba(0,0,0,0.45);
    border: 2px solid rgba(255,255,255,0.25);
    border-radius: 14px;
    color: #fff !important;
    outline: none;
}

.chat-input-area input::placeholder {
    color: #9fdfff;
}

#sendBtn {
    width: 52px;
    height: 46px;
    border-radius: 14px;
    border: none;
    background: var(--theme-glow);
    color: #000;
    font-weight: 700;
    box-shadow: 0 0 12px var(--theme-glow);
    cursor: pointer;
}

#sendBtn.stop-mode {
    background: #ff3b3b !important;
    color: #fff !important;
}


/* ============================================================
   MODE PILL
============================================================ */
.mode-pill {
    padding: 0 12px;
    height: 40px;
    display: flex;
    align-items: center;
    background: rgba(0,0,0,0.35);
    border: 2px solid var(--theme-glow);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--theme-glow);
}


/* ============================================================
   WIPE OVERLAY
============================================================ */
#wipeOverlay {
    position: fixed;
    inset: 0;
    z-index: 999999999;
    background: rgba(5, 0, 20, 0.92);
    backdrop-filter: blur(12px);
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease;
}

#wipeOverlay.show {
    opacity: 1;
    pointer-events: auto;
}

.wipe-container { text-align: center; }

.wipe-text {
    margin-top: 18px;
    font-size: 18px;
    letter-spacing: 0.5px;
    color: #dfe9ff;
}

.wipe-loader {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.25);
    border-top-color: var(--theme-glow);
    animation: wipeSpin 1s linear infinite;
}

@keyframes wipeSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}


/* ============================================================
   ANDROID VIEWPORT STABILITY FIXES
============================================================ */
html, body {
    height: 100%;
    overscroll-behavior: none;
}

#bgLayer {
    transform: translateZ(0);
}

#bgVideo {
    transform: translateZ(0) scale(1.05);
    backface-visibility: hidden;
}

@supports (-webkit-touch-callout: none) {
    #bgVideo {
        transform: translateZ(0) scale(1.05);
    }
}
