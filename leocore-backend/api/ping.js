export default async function handler(req, res) {
    try {
        const renderHealth = await fetch("https://leocore.onrender.com/api/health", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!renderHealth.ok) {
            return res.status(500).json({
                ok: false,
                status: "Render health endpoint failed"
            });
        }

        return res.status(200).json({
            ok: true,
            status: "Render backend is awake"
        });

    } catch (err) {
        return res.status(500).json({
            ok: false,
            error: err.toString()
        });
    }
}
