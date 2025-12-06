import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";

const app = express();

// ==============================
// CORS CONFIG FOR VERCEL + RENDER
// ==============================
app.use(cors({
    origin: [
        "https://leocore.vercel.app",
        "https://leocore.onrender.com"
    ],
    methods: ["POST"],
    allowedHeaders: ["Content-Type"]
}));

// Parse JSON
app.use(express.json({ limit: "1mb" }));

// ==============================
// AI CHAT ROUTE
// ==============================
app.post("/api/chat", chatHandler);

// ==============================
// HOME TEST
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
