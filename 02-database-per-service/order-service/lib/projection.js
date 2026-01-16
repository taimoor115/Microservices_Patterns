const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
let db;

async function initOrderMongo() {
    const client = await MongoClient.connect(url);
    db = client.db('order_read_db'); // Dedicated Read DB for Orders
    console.log("✅ Order Service: MongoDB Connected");
}

// 1. Update the actual Order document
async function updateOrderReadModel(orderData) {
    const collection = db.collection('orders');
    await collection.replaceOne({ _id: orderData.orderId }, orderData, { upsert: true });
    console.log("📊 Order Read Model Updated");
}

// 2. Sync the User Cache (Listening to User Service events)
async function syncUserToCache(userData) {
    const collection = db.collection('user_cache');
    await collection.replaceOne({ userId: userData.userId }, userData, { upsert: true });
    console.log("👤 User Cache Synced in Order Service");
}

// 3. Helper to validate user locally
async function validateUserLocally(userId) {
    const user = await db.collection('user_cache').findOne({ userId });
    return !!user;
}

async function getOrder(id) {
    return await db.collection('orders').findOne({ _id: id });
}

module.exports = {
    initOrderMongo,
    updateOrderReadModel,
    syncUserToCache,
    validateUserLocally,
    getOrder
};