import fetch from "node-fetch";

let orderCount = 0;
const orderIds = []; // store all order IDs
const DURATION_MS = 30_000; // 30 seconds
let stop = false;

// Stop flag after 30s
setTimeout(() => {
    stop = true;
    console.log(`\n⏹ 30s over.`);
    console.log(`📊 Total orders created: ${orderCount}`);
    console.log(`📝 Order IDs:`, orderIds.join(", "));
    process.exit(0);
}, DURATION_MS);

async function createOrder() {
    if (stop) return; // Stop after 30s

    try {
        const res = await fetch("http://localhost:3000/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: Math.floor(Math.random() * 10000) + 100 })
        });

        const data = await res.json();
        orderCount++;
        orderIds.push(data.orderId); // save ID
        console.log(`Order #${orderCount} created:`, data.orderId);
    } catch (err) {
        console.error("Error creating order:", err.message);
    }

    // Immediately call next request
    createOrder();
}

// Start infinite auto-cannon requests
createOrder();
