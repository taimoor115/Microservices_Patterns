import { connectRabbit, getChannel } from './rabbit.js';

let stock = 1000000000000000000000000000000; // 1 item for easy fail test

await connectRabbit();
const channel = getChannel();

channel.assertQueue("inventory.reserve");
channel.assertQueue("inventory.release");

channel.consume("inventory.reserve", msg => {
    const { orderId } = JSON.parse(msg.content.toString());

    if (stock <= 0) {
        console.log(`❌ Inventory failed for order ${orderId}`);
        channel.sendToQueue("saga.failed", Buffer.from(JSON.stringify({ orderId })));
        channel.ack(msg);
        return;
    }

    stock--;
    console.log(`✅ Inventory reserved for order ${orderId}. Stock left: ${stock}`);
    channel.ack(msg);
});

channel.consume("inventory.release", msg => {
    const { orderId } = JSON.parse(msg.content.toString());
    stock++;
    console.log(`♻ Inventory released for order ${orderId}. Stock now: ${stock}`);
    channel.ack(msg);
});

// import { connectRabbit, getChannel } from "./rabbit.js"

// let stock = 2

// await connectRabbit()
// const channel = getChannel()

// channel.assertQueue("inventory.reserve")
// channel.assertQueue("inventory.release")

// channel.consume("inventory.reserve", msg => {
//     const { orderId } = JSON.parse(msg.content.toString())

//     if (stock <= 0) {
//         channel.sendToQueue("saga.failed", Buffer.from(JSON.stringify({ orderId })))
//         channel.ack(msg)
//         return
//     }

//     stock--
//     channel.ack(msg)
// })

// channel.consume("inventory.release", msg => {
//     stock++
//     channel.ack(msg)
// })
// console.log("📦 Inventory Service running")