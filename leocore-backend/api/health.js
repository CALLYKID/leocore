export default async function handler(req, res) {
    return res.status(200).json({
        alive: true,
        service: "LeoCore Backend",
        timestamp: Date.now()
    });
}
