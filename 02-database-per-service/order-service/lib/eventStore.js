const { Pool } = require('pg');

// Hardcoded for your local Postgres
const pool = new Pool({
    connectionString: 'postgresql://postgres:SoftMind789@localhost:5432/order_event_db'
});

async function saveOrderEvent(event) {
    const query = 'INSERT INTO events (aggregate_id, aggregate_type, event_type, data) VALUES ($1, $2, $3, $4)';
    try {
        await pool.query(query, [event.id, event.aggregate_type, event.type, event.data]);
        console.log(`💾 Order Event [${event.type}] saved to Postgres`);
    } catch (err) {
        console.error("❌ Postgres Save Error", err);
        throw err;
    }
}

module.exports = { saveOrderEvent };