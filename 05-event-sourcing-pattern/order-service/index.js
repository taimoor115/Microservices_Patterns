const express = require('express');
const crypto = require('crypto');

const { saveOrderEvent } = require('./lib/eventStore');
const { publish, subscribe } = require('./lib/rabbit');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());
let db;

async function start() {
    try {
        const client = await MongoClient.connect('mongodb://localhost:27017');
        db = client.db('order_db');
        console.log('✅ Order Service: Connected to MongoDB');
    } catch (err) {
        console.error('❌ Order Service: MongoDB Connection Error', err);
    }
    try {
        await saveOrderEvent({ id: crypto.randomUUID(), aggregate_type: 'TEST', type: 'TEST', data: { test: true } });
        console.log('✅ Order Service: Connected to Postgres');
    } catch (err) {
        console.error('❌ Order Service: Postgres Connection Error', err);
    }
    // Test RabbitMQ connection
    try {
        await publish('order.test', { test: true });
        console.log('✅ Order Service: Connected to RabbitMQ');
    } catch (err) {
        console.error('❌ Order Service: RabbitMQ Connection Error', err);
    }

    // Subscribe to user.created events AFTER DB is ready
    subscribe('order_service_user_sync', 'user.created', async (user) => {
        try {
            await db.collection('user_cache').insertOne(user);
            console.log("👤 User cached in Order Service:", user.userId);
        } catch (err) {
            console.error("❌ Failed to cache user:", err.message);
        }
    });
}

app.post('/place', async (req, res) => {
    try {
        const { userId, item } = req.body;
        const user = await db.collection('user_cache').findOne({ userId });
        if (!user) return res.status(400).json({ error: "User unknown" });

        const orderId = crypto.randomUUID();
        const event = { id: orderId, aggregate_type: 'ORDER', type: 'ORDER_PLACED', data: { orderId, userId, item } };

        await saveOrderEvent(event);
        await publish('order.placed', event.data);
        res.json({ orderId });
    } catch (err) {
        console.error('Order Service Error:', err);
        res.status(500).json({
            error: err.message || err,
            stack: err.stack,
            full: err
        });
    }
});

app.listen(3002, async () => {
    console.log("Order Service on 3002");
    await start();
});