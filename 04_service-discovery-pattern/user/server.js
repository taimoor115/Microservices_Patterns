const express = require("express");
const axios = require("axios");

const PORT = process.argv[2];
const HOST = "localhost";
const app = express();

async function register() {
    await axios.post("http://localhost:3000/register", {
        name: "user-service",
        host: HOST,
        port: PORT,
    });
}

app.get("/users", (req, res) => {
    res.json({ server: PORT, users: ["Alice", "Bob", "Charlie"] });
});

app.listen(PORT, async () => {
    console.log(`USER SERVICE running on ${PORT}`);
    await register();
});
