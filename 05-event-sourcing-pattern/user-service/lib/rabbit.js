const amqp = require('amqplib');

let channel;
const RABBIT_URL = 'amqp://localhost'; // Hardcoded for your Docker RabbitMQ

async function connectRabbit() {
    try {
        const conn = await amqp.connect(RABBIT_URL);
        channel = await conn.createChannel();
        await channel.assertExchange('app_events', 'topic', { durable: true });
        console.log("✅ RabbitMQ Connected");
    } catch (e) { console.error("Rabbit Error", e); }
}

async function publish(key, data) {
    if (!channel) await connectRabbit();
    channel.publish('app_events', key, Buffer.from(JSON.stringify(data)));
}

async function subscribe(queue, key, callback) {
    if (!channel) await connectRabbit();
    const q = await channel.assertQueue(queue, { durable: true });
    channel.bindQueue(q.queue, 'app_events', key);
    channel.consume(q.queue, (msg) => {
        if (msg !== null) {
            try {
                const data = JSON.parse(msg.content.toString());
                callback(data);
            } catch (err) {
                console.error("❌ Failed to parse message:", err.message);
            }
            channel.ack(msg);
        }
    });
}

module.exports = { publish, subscribe };