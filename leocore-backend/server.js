import express from "express";
import handler from "./leocore-backend/api/chat.js";

const app = express();
app.use(express.json());

// ROUTE FOR AI CHAT
app.post("/api/chat", handler);

app.get("/", (req, res) => {
    res.send("LeoCore backend is running");
});

// Render picks a port from env
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log("LeoCore backend running on port " + PORT);
});
