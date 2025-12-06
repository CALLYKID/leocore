import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";

const app = express();

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

app.use(express.json({ limit: "1mb" }));

// Remove ALL SSE headers here — chat.js will handle streaming headers
app.use((req, res, next) => {
    next();
});

app.post("/api/chat", chatHandler);

app.get("/", (req, res) => {
    res.send("Leocore Backend is running 😎");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🔥 Leocore backend running on port", PORT);
});
