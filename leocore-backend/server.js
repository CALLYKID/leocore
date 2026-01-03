// ============================================================
// IMPORTS (ESM — MUST COME FIRST)
// ============================================================
import 'dotenv/config';
import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";
import helmet from "helmet";


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
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "20mb" }));


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

// ================= SHARE STORE =================
const sharedChats = new Map();

// Save shared chat
app.post("/api/share", async (req, res) => {
  const { id, chat } = req.body;
  if (!id || !chat) return res.status(400).json({ error: "Invalid" });

  sharedChats.set(id, {
    chat,
    created: Date.now()
  });

  res.json({ success: true });
});

// Load shared chat
app.get("/api/share/:id", async (req, res) => {
  const data = sharedChats.get(req.params.id);
  if (!data) return res.status(404).json({ error: "Not found" });

  res.json(data.chat);
});

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
// Every hour, delete shares older than 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of sharedChats.entries()) {
    if (now - data.created > 86400000) sharedChats.delete(id);
  }
}, 3600000);
