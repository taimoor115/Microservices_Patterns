# 📚 Event Sourcing Pattern (05) - Complete Guide

---

```bash
# Terminal 1 - API Gateway
cd api-gateway && node index.js

# Terminal 2 - User Service  
cd user-service && npx nodemon index.js

# Terminal 3 - Order Service
cd order-service && npx nodemon index.js

# Then: Open request.http in VS Code and test!
```

## 🚀 How to Run

### Prerequisites
- **PostgreSQL** localhost:5432 (user: postgres, password: SoftMind789)
- **MongoDB** localhost:27017
- **RabbitMQ** localhost:5672

### Step 1: Initialize Database
```bash
psql -U postgres -d user_event_db -f init.sql
psql -U postgres -d order_event_db -f init.sql
```

### Step 2: Start 3 Services

**Terminal 1:**
```bash
cd api-gateway && npm install && node index.js
# Output: Gateway on 3000
```

**Terminal 2:**
```bash
cd user-service && npm install && npx nodemon index.js
# Output:
# ✅ MongoDB Connected
# User Service on 3001
# ✅ RabbitMQ Connected
```

**Terminal 3:**
```bash
cd order-service && npm install && npx nodemon index.js
# Output:
# ✅ Order Service: Connected to MongoDB
# Order Service on 3002
# ✅ Order Service: Connected to Postgres
# ✅ Order Service: Connected to RabbitMQ
```

---

## 🧪 Test Sequence (Using request.http)

### Test 1: Create User
```http
POST http://localhost:3000/users
Content-Type: application/json

{
    "name": "Arslan Architect",
    "email": "arslan@example.com"
}
```

**Response (202):**
```json
{
  "userId": "c986e1fa-0d24-48fd-b01c-f13790cc2ad7"
}
```

**Console Shows:**
```
👤 User cached in Order Service: c986e1fa-0d24-48fd-b01c-f13790cc2ad7
🛠 Updating User Projection...
```

---

### Test 2: Wait 1-2 seconds
Let async event processing complete.

---

### Test 3: Get User from Read Model
```http
GET http://localhost:3000/users/c986e1fa-0d24-48fd-b01c-f13790cc2ad7
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "userId": "c986e1fa-0d24-48fd-b01c-f13790cc2ad7",
  "name": "Arslan Architect",
  "email": "arslan@example.com"
}
```

---

### Test 4: Place Order
```http
POST http://localhost:3000/orders
Content-Type: application/json

{
    "userId": "c986e1fa-0d24-48fd-b01c-f13790cc2ad7",
    "item": "MacBook Pro M3",
    "price": 2500
}
```

**Response (200):**
```json
{
  "orderId": "34445c16-320c-4324-8d87-72c3fca0f997"
}
```

**Console Shows:**
```
💾 Order Event [ORDER_PLACED] saved to Postgres
📊 Order Read Model updated: 34445c16-320c-4324-8d87-72c3fca0f997
```

---

### Test 5: Wait 1-2 seconds
Let async event processing complete.

---

### Test 6: Get Order from Read Model
```http
GET http://localhost:3002/queries/orders/34445c16-320c-4324-8d87-72c3fca0f997
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "orderId": "34445c16-320c-4324-8d87-72c3fca0f997",
  "userId": "c986e1fa-0d24-48fd-b01c-f13790cc2ad7",
  "item": "MacBook Pro M3",
  "price": 2500
}
```

---

## ✅ Success Criteria

All working when:
- ✅ All 3 services start without errors
- ✅ Create user returns 202 with userId
- ✅ Query user shows all details (read model populated)
- ✅ Place order returns 200 with orderId
- ✅ Query order shows all details (read model populated)
- ✅ Console shows: "👤 User cached", "📊 Order Read Model updated"
- ✅ No errors in console

---

## 🆘 Troubleshooting

### "User unknown" error placing order

**Cause:** Order service didn't cache the user

**Fix:**
1. Wait 1-2 seconds after creating user
2. Check order service console for "👤 User cached" message
3. If missing, restart order service: Kill Terminal 3, restart
4. Verify MongoDB running: `mongosh mongodb://localhost:27017`

---

### "Cannot GET /queries/orders/..." (404 error)

**Cause:** Order read model wasn't updated

**Fix:**
1. Wait 1-2 seconds after placing order
2. Check order service console for "📊 Order Read Model updated"
3. If missing, restart order service
4. Verify MongoDB running

---

### "Failed to parse message" in logs

**Cause:** Old corrupted messages in RabbitMQ

**Fix:**
```bash
cd user-service
node -e "const amqp = require('amqplib'); (async () => { const conn = await amqp.connect('amqp://localhost'); const ch = await conn.createChannel(); await ch.deleteQueue('user_projection_queue'); await ch.deleteQueue('order_service_user_sync'); await ch.deleteQueue('order_read_model_queue'); console.log('✅ Cleanup done'); await ch.close(); await conn.close(); })();"
```

---

### Database connection errors

**Checklist:**
- PostgreSQL: `psql -U postgres -h localhost`
- MongoDB: `mongosh mongodb://localhost:27017`
- RabbitMQ: http://localhost:15672 (guest:guest)
- Credentials correct: postgres:SoftMind789

---

## 📊 Architecture & Data Flow

```
API GATEWAY (3000)
    ↓
    ├─→ POST /users → User Service (3001)
    │   ├─→ Generate UUID
    │   ├─→ Create USER_CREATED event
    │   ├─→ Save to PostgreSQL
    │   ├─→ Publish to RabbitMQ
    │   └─→ Return userId
    │
    └─→ POST /orders → Order Service (3002)
        ├─→ Find user in MongoDB cache ✅
        ├─→ Create ORDER_PLACED event
        ├─→ Save to PostgreSQL
        ├─→ Publish to RabbitMQ
        └─→ Return orderId

RabbitMQ Message Bus
    ├─→ user.created → User Service reads model subscriber
    │   └─→ Update MongoDB read model
    │
    └─→ order.placed → Order Service read model subscriber
        └─→ Update MongoDB read model

Queries (GET)
    ├─→ GET /users/{id} → Read from MongoDB
    └─→ GET /queries/orders/{id} → Read from MongoDB
```

---

## 💾 Files Modified

| File | Changes | Issue |
|------|---------|-------|
| `user-service/lib/eventStore.js` | Added aggregate_type to query | #1 |
| `user-service/index.js` | Added aggregate_type to event | #1 |
| `user-service/lib/rabbit.js` | Added error handling | #2 |
| `order-service/index.js` | Moved subscription + added query | #3, #4 |
| `order-service/lib/rabbit.js` | Added error handling | #2 |

---

## 🔑 Key Concepts

**Event Sourcing:**
- Every state change recorded as immutable event
- Events stored in PostgreSQL
- Can replay events to rebuild state

**Read Models:**
- Denormalized copies in MongoDB
- Optimized for fast queries
- Updated asynchronously

**CQRS:**
- Commands (POST/PUT): Save events
- Queries (GET): Read from read models

**Async Communication:**
- Services talk via RabbitMQ
- Loose coupling, no direct calls
- Eventual consistency

---

## 📝 Environment Variables Needed

All hardcoded in code (for testing):
```
PostgreSQL: postgresql://postgres:SoftMind789@localhost:5432/{user_event_db|order_event_db}
MongoDB: mongodb://localhost:27017
RabbitMQ: amqp://localhost
```

---

## ✨ What Works Now

✅ Users created and cached in order service  
✅ Orders placed without "User unknown" errors  
✅ Order queries return data (no 404)  
✅ Events saved to PostgreSQL  
✅ Events published to RabbitMQ  
✅ Read models updated in MongoDB  
✅ Async event processing works  
✅ Error handling prevents crashes  

---

## 🎯 Next Steps (Optional)

1. Add transaction support
2. Implement snapshot pattern
3. Add dead-letter queues
4. Add distributed tracing
5. Add comprehensive logging
6. Add API rate limiting
7. Implement saga pattern for complex workflows

---

**All Issues Resolved ✅**  
**Ready for Testing ✅**  
**Documentation Complete ✅**

**Created:** January 16, 2026
