const express = require('express');
const app = express();

app.get('/orders/:id', (req, res) => {
    console.log("Order Service hit!");
    res.json({
        orderId: req.params.id,
        item: "Gaming Laptop",
        price: 1500,
        status: "Shipped"
    });
});

app.listen(4002, () => console.log('Order Service running on port 4002'));