const amqp = require('amqplib');

async function cleanupRabbit() {
    try {
        const conn = await amqp.connect('amqp://localhost');
        const channel = await conn.createChannel();

        // Delete old queues
        const queuesToDelete = [
            'user_projection_queue',
            'order_service_user_sync'
        ];

        for (const queue of queuesToDelete) {
            try {
                await channel.deleteQueue(queue);
                console.log(`✅ Deleted queue: ${queue}`);
            } catch (err) {
                console.log(`⚠️ Queue ${queue} not found or already deleted`);
            }
        }

        console.log("✅ RabbitMQ cleanup complete!");
        await channel.close();
        await conn.close();
        process.exit(0);
    } catch (err) {
        console.error("❌ Cleanup failed:", err);
        process.exit(1);
    }
}

cleanupRabbit();
