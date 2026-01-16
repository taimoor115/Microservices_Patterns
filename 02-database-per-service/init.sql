CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_type TEXT NOT NULL, -- 'USER' or 'ORDER'
    event_type TEXT NOT NULL,      -- 'USER_CREATED', 'ORDER_PLACED'
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);