module.exports = async (req, res) => {
    return res.status(200).json({
        reply: "Backend is alive!"
    });
};
