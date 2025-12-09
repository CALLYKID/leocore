import express from "express";
import cors from "cors";
import chatHandler from "./api/chat.js";

const app = express();
app.use(cors());
app.use(express.json());

// ROUTE FOR AI CHAT
app.post("/api/chat", chatHandler);

app.get("/", (req, res) => {
    res.send("LeoCore backend is running");
});

// Render environment port
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("LeoCore backend running on port " + PORT);
});
