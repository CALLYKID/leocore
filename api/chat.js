export default async function handler(req, res) {
    console.log("REQUEST RECEIVED:", req.method);

    if (req.method !== "POST") {
        return res.status(400).send("POST only.");
    }

    try {
        const { message, userId } = req.body;
        console.log("INPUT:", message, userId);

        // Start SSE
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive"
        });

        // MOCK TEST FIRST
        res.write(`data: Hello ${userId}\n\n`);
        res.write(`data: This proves streaming works.\n\n`);
        res.write(`data: END\n\n`);
        res.end();

        console.log("STREAM SENT SUCCESSFULLY");
    } catch (err) {
        console.log("SERVER ERROR:", err);
        return res.status(500).send("Server error.");
    }
}
