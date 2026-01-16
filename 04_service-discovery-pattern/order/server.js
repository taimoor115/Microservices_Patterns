const express = require("express");
const axios = require("axios");

const PORT = process.argv[2];
const HOST = "localhost";
const app = express();

async function register() {
    await axios.post("http://localhost:3000/register", {
        name: "order-service",
        host: HOST,
        port: PORT,
    });
}

app.get("/orders", async (req, res) => {
    try {
        const { data } = await axios.get("http://localhost:3000/discover/user-service");
        const users = await axios.get(`http://${data.host}:${data.port}/users`);

        res.json({
            orderServer: PORT,
            orders: [
                { id: 101, user: users.data.users[0], item: "Laptop" },
                { id: 102, user: users.data.users[1], item: "Phone" },
            ],
        });
    } catch (err) {
        res.status(500).send("User service unavailable");
    }
});

app.listen(PORT, async () => {
    console.log(`ORDER SERVICE running on ${PORT}`);
    await register();
});
