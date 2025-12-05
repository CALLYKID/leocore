import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";

const app = express();

// ==============================
// FIXED CORS (REQUIRED FOR RENDER + VERCEL)
// ==============================
app.use(cors({
    origin: [
        "https://leocore.vercel.app",
        "https://leocore.onrender.com"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

// Allow JSON bodies
app.use(express.json({ limit: "1mb" }));

// AI Route
app.post("/api/chat", chatHandler);

// Home route
app.get("/", (req, res) => {
    res.send("Leocore Backend is running 😎");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🔥 Leocore backend running on port", PORT);
});
