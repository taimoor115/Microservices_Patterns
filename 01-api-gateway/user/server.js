const express = require('express');
const app = express();

app.get('/users/:id', (req, res) => {
    console.log("User Service hit!");
    res.json({
        id: req.params.id,
        name: "John Doe",
        email: "john@example.com"
    });
});

app.listen(4001, () => console.log('User Service running on port 4001'));