/* ============================================================
   GLOBAL RESET
============================================================ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  width: 100%;
  height: 100%;
  background: transparent !important;
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
}

/* ============================================================
   BACKGROUND VIDEO — NEVER TOUCHED
============================================================ */
#bgLayer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  pointer-events: none;
  z-index: -10;
}

#bgVideo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: -11;

  filter:
    brightness(1.05)
    contrast(1.1)
    saturate(1.15);

  transform: translateZ(0);
}

/* ============================================================
   APP WRAPPER
============================================================ */
.app-wrapper {
  position: relative;
  min-height: 100vh;
  padding-bottom: 80px;
  z-index: 0;
}

/* ============================================================
   NEON BORDER SYSTEM (ALIVE, PREMIUM)
============================================================ */
.neon-border {
  position: relative;
  z-index: 0;
  border-radius: 18px;
  background: rgba(5, 20, 35, 0.6);
  backdrop-filter: blur(12px);
  overflow: hidden;
}

/* outer glow */
.neon-border::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(
    120deg,
    #00eaff,
    #8a2eff,
    #00eaff
  );
  background-size: 300% 300%;
  animation: neonFlow 6s linear infinite;
  filter: blur(14px);
  opacity: 0.8;
  z-index: -1;
}

/* inner edge */
.neon-border::after {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: rgba(5, 20, 35, 0.85);
  z-index: -1;
}

/* flame variant */
.neon-border.flame::before {
  background: linear-gradient(
    120deg,
    #ff0033,
    #ff7a00,
    #ff0033
  );
}

@keyframes neonFlow {
  0% { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}

/* ============================================================
   HERO
============================================================ */
.center-wrapper {
  text-align: center;
  padding-top: 12vh;
  padding-bottom: 5vh;
}

/* fake input */
.fake-input {
  width: auto;
  max-width: 80vw;
  min-width: 200px;
  padding: 16px 24px;
  margin: 0 auto 28px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fake-text {
  font-size: 16px;
  opacity: 0.9;
  white-space: nowrap;
}

/* title */
.main-title {
  font-size: 44px;
  font-weight: 800;
  margin-bottom: 6px;
}

.subtitle {
  font-size: 18px;
  opacity: 0.8;
}

/* ============================================================
   SECTIONS
============================================================ */
.section-title {
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 22px;
}

/* ============================================================
   MODE GRID
============================================================ */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  padding: 0 22px;
}

.mode-btn {
  padding: 18px;
  border-radius: 18px;
  border: none;
  color: #eaf9ff;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
}

/* active feel */
.mode-btn:active {
  transform: scale(0.98);
}

/* ============================================================
   MOBILE SAFETY
============================================================ */
@supports (-webkit-touch-callout: none) {
  #bgVideo {
    transform: translateZ(0) scale(1.05);
  }
    }
