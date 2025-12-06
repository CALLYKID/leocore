import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";

const app = express();

// ==============================
// CORS CONFIG (Render + Vercel + Local Testing)
// ==============================
app.use(cors({
    origin: [
        "https://leocore.vercel.app",
        "https://leocore.onrender.com",
        "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: false
}));

// Parse JSON
app.use(express.json({ limit: "1mb" }));

// ==============================
// SSE SAFETY MIDDLEWARE 🔥
// Ensures Render does NOT buffer streaming responses
// ==============================
app.use((req, res, next) => {
    // These do NOT break regular requests, but unlock SSE
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    // Required on some hosts (Render sometimes needs this)
    if (res.flushHeaders) res.flushHeaders();

    next();
});

// ==============================
// AI ROUTE
// ==============================
app.post("/api/chat", chatHandler);

// ==============================
// HOME ROUTE
// ==============================
app.get("/", (req, res) => {
    res.send("Leocore Backend is running 😎");
});

// ==============================
// START SERVER
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🔥 Leocore backend running on port", PORT);
});
