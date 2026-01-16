const express = require('express');
// const { v4: uuid } = require('uuid');
let uuid;
(async () => {
    uuid = (await import('uuid')).v4;
})();
const { saveEvent } = require('./lib/eventStore');
const { publish, subscribe } = require('./lib/rabbit');
const { initMongo, updateReadModel, findUser } = require('./lib/projection');

const app = express();
app.use(express.json());

// COMMAND
app.post('/create', async (req, res) => {
    const userId = uuid();
    const event = { id: userId, aggregate_type: 'USER', type: 'USER_CREATED', data: { userId, ...req.body } };

    await saveEvent(event);
    await publish('user.created', event.data);
    res.status(202).json({ userId });
});

// QUERY
app.get('/:id', async (req, res) => {
    const user = await findUser(req.params.id);
    res.json(user || { error: "Not found" });
});

// WORKER (Self-consumption for Read Model)
subscribe('user_projection_queue', 'user.created', async (data) => {
    console.log("🛠 Updating User Projection...");
    await updateReadModel(data);
});

app.listen(3001, async () => {
    await initMongo();
    console.log("User Service on 3001");
});