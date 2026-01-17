import amqp from "amqplib"

let channel

export const connectRabbit = async () => {
    const conn = await amqp.connect("amqp://localhost")
    channel = await conn.createChannel()
    console.log("🐇 Connected to RabbitMQ")
}

export const getChannel = () => channel
