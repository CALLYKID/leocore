import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";

const app = express();
app.use(cors());
app.use(express.json());

// AI CHAT ROUTE
app.post("/api/chat", chatHandler);

// PING ROUTE (used by frontend keep-alive)
app.get("/ping", (req, res) => {
    res.status(200).send("pong");
});

// HOME ROUTE
app.get("/", (req, res) => {
    res.send("LeoCore backend is running");
});

// Render port
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("LeoCore backend running on port " + PORT);
});
