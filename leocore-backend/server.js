import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";

const app = express();

// ==============================
// CORS CONFIG FOR RENDER + VERCEL
// ==============================
app.use(cors({
    origin: [
        "https://leocore.vercel.app",
        "https://leocore.onrender.com"
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: false
}));

// Parse JSON
app.use(express.json({ limit: "1mb" }));

// ==============================
// NOTICE:
// We REMOVED the SSE middleware!
// chat.js now handles all headers.
// ==============================

// ==============================
// AI ROUTE
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
