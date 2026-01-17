import express from "express"
import { randomUUID } from "crypto"
import { connectRabbit, getChannel } from "./rabbit.js"

const app = express()
app.use(express.json())

const orders = new Map()

await connectRabbit()
const channel = getChannel()

// REAL ENTRY POINT
app.post("/orders", (req, res) => {
    const orderId = randomUUID()

    orders.set(orderId, "PROCESSING")

    // SAGA STARTS HERE
    channel.sendToQueue("inventory.reserve", Buffer.from(JSON.stringify({ orderId })))
    channel.sendToQueue("payment.process", Buffer.from(JSON.stringify({ orderId })))

    res.status(202).json({
        orderId,
        status: "PROCESSING"
    })
})

// STATUS API (REAL WORLD MUST)
app.get("/orders/:id", (req, res) => {
    const status = orders.get(req.params.id)
    res.json({ orderId: req.params.id, status })
})

// LISTEN FOR FAILURES
channel.assertQueue("saga.failed")
channel.consume("saga.failed", msg => {
    const { orderId } = JSON.parse(msg.content.toString())
    orders.set(orderId, "FAILED")

    // COMPENSATION
    channel.sendToQueue("inventory.release", Buffer.from(JSON.stringify({ orderId })))
    channel.ack(msg)
})

// SUCCESS
channel.assertQueue("saga.completed")
channel.consume("saga.completed", msg => {
    const { orderId } = JSON.parse(msg.content.toString())
    orders.set(orderId, "COMPLETED")
    channel.ack(msg)
})

app.listen(3000, () => {
    console.log("🧠 Order Service API running on 3000")
})
