const { MongoClient } = require('mongodb');
const url = 'mongodb://localhost:27017';
let db;

async function initMongo() {
    const client = await MongoClient.connect(url);
    db = client.db('user_read_db');
    console.log("✅ MongoDB Connected");
}

async function updateReadModel(user) {
    await db.collection('users').replaceOne({ _id: user.userId }, user, { upsert: true });
}

async function findUser(id) {
    return await db.collection('users').findOne({ _id: id });
}

module.exports = { initMongo, updateReadModel, findUser };