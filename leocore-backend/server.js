import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";

const app = express();

// Allow your frontend to make requests
app.use(cors());

// Allow JSON bodies
app.use(express.json({ limit: "1mb" }));

// AI Route
app.post("/api/chat", chatHandler);

// Home test route
app.get("/", (req, res) => {
    res.send("Leocore Backend is running 😎");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🔥 Leocore backend running on port", PORT);
});
