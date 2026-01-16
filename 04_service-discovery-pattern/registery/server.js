const express = require("express");
const app = express();
app.use(express.json());

const services = {};

app.post("/register", (req, res) => {
    const { name, host, port } = req.body;
    if (!services[name]) services[name] = [];
    services[name].push({ host, port });
    console.log(`REGISTERED → ${name} at ${host}:${port}`);
    res.sendStatus(200);
});

app.get("/discover/:name", (req, res) => {
    const list = services[req.params.name];
    if (!list || list.length === 0) return res.status(404).json({ error: "Service not found" });
    const instance = list[Math.floor(Math.random() * list.length)];
    res.json(instance);
});

app.listen(3000, () => console.log("SERVICE REGISTRY running on :3000"));
