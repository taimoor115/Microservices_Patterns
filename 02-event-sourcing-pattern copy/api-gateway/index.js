const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
// Just for learning I am using the axios not the express-http-proxy package
app.post('/users', async (req, res) => {
    const r = await axios.post('http://localhost:3001/create', req.body);
    res.json(r.data);
});

app.get('/users/:id', async (req, res) => {
    const r = await axios.get(`http://localhost:3001/${req.params.id}`);
    res.json(r.data);
});

app.post('/orders', async (req, res) => {
    try {
        const r = await axios.post('http://localhost:3002/place', req.body);
        res.json(r.data);
    } catch (e) { res.status(400).json(e.response.data); }
});

app.listen(3000, () => console.log("Gateway on 3000"));