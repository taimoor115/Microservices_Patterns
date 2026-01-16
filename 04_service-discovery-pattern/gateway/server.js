const express = require("express");
const axios = require("axios");
const app = express();

app.use((req, res, next) => {
    const apiKey = req.headers['api-key'];
    if (apiKey === 'secret123') {
        next();
    } else {
        res.status(401).send("Unauthorized: Invalid API Key");
    }
});

app.get("/api/users", async (req, res) => {
    try {
        const { data } = await axios.get("http://localhost:3000/discover/user-service");
        if (!data || !data.host || !data.port) {
            return res.status(503).json({ error: "User service not available" });
        }
        const response = await axios.get(`http://${data.host}:${data.port}/users`);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "User service error", details: err.message });
    }
});

app.get("/api/orders", async (req, res) => {
    try {
        const { data } = await axios.get("http://localhost:3000/discover/order-service");
        if (!data || !data.host || !data.port) {
            return res.status(503).json({ error: "Order service not available" });
        }
        const response = await axios.get(`http://${data.host}:${data.port}/orders`);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "Order service error", details: err.message });
    }
});

app.listen(4000, () => console.log("API GATEWAY running on :4000"));
