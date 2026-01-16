const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:SoftMind789@localhost:5432/user_event_db'
});

async function saveEvent(event) {
    const query = 'INSERT INTO events (aggregate_id, aggregate_type, event_type, data) VALUES ($1, $2, $3, $4)';
    await pool.query(query, [event.id, event.aggregate_type || 'USER', event.type, event.data]);
    console.log("💾 Event stored in Postgres");
}

module.exports = { saveEvent };