// ============================================================
// IMPORTS (ESM — MUST COME FIRST)
// ============================================================
import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";


// ============================================================
// ENVIRONMENT GUARD (HARD FAIL IF MISCONFIGURED)
// ============================================================
if (!process.env.GROQ_API_KEY) {
  console.error("❌ FATAL: GROQ_API_KEY is missing.");
  console.error("➡️ Add it in Render → Service → Environment Variables.");
  process.exit(1);
}


// ============================================================
// APP SETUP
// ============================================================
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));


// ============================================================
// ROUTES
// ============================================================

// Health check (debug-safe)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    groqKeyLoaded: true,
    uptime: process.uptime()
  });
});

// Ping (frontend warm-up / keep-alive)
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// AI Chat (POST ONLY)
app.post("/api/chat", chatHandler);

// Root
app.get("/", (req, res) => {
  res.send("LeoCore backend is running");
});


// ============================================================
// START SERVER (RENDER SAFE)
// ============================================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 LeoCore backend running on port ${PORT}`);
});
