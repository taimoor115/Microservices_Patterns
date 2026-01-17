import { connectRabbit, getChannel } from "./rabbit.js"

await connectRabbit()
const channel = getChannel()

channel.assertQueue("payment.process")

channel.consume("payment.process", msg => {
    const { orderId } = JSON.parse(msg.content.toString())

    const fail = Math.random() > 0.6
    // const fail = true;

    if (fail) {
        channel.sendToQueue("saga.failed", Buffer.from(JSON.stringify({ orderId })))
    } else {
        channel.sendToQueue("saga.completed", Buffer.from(JSON.stringify({ orderId })))
    }

    channel.ack(msg)
})
