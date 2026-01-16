# 🔴 Circuit Breaker Pattern - Complete Guide

## 📚 Complete Documentation in One File

---

## Table of Contents
1. [What is Circuit Breaker?](#what-is-circuit-breaker)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Code Understanding](#code-understanding)
5. [Setup & Installation](#setup--installation)
6. [Running the Application](#running-the-application)
7. [Testing the Circuit Breaker](#testing-the-circuit-breaker)
8. [Visual State Diagrams](#visual-state-diagrams)
9. [Request Flow Examples](#request-flow-examples)
10. [Troubleshooting](#troubleshooting)

---

## What is Circuit Breaker?

### Simple Explanation
Think of it like an electrical circuit breaker in your home:

```
CLOSED ✅ → Normal state, power flows through
OPEN 🔴   → Power is cut off to prevent damage
HALF-OPEN ⚡ → Testing if power is safe to restore
```

### In Microservices
- **CLOSED**: Service is healthy, requests pass through normally
- **OPEN**: Service is failing, requests are blocked and fallback response is returned
- **HALF-OPEN**: Service attempted recovery, testing with limited requests

### Why It Matters
Without Circuit Breaker (Bad):
```
Request 1: Timeout (3000ms)
Request 2: Timeout (3000ms)
Request 3: Timeout (3000ms)
Total: 9 seconds wasted + resource drain
```

With Circuit Breaker (Good):
```
Request 1: Timeout (3000ms)
Request 2: Timeout (3000ms)
Request 3: Instant Fallback (1ms) ← Circuit opens!
Request 4: Instant Fallback (1ms)
Request 5: Instant Fallback (1ms)
Total: 6 seconds + Saves resources
```

---

## Architecture

### System Diagram
```
┌──────────────────────────────────────────────────┐
│                 CLIENT BROWSER                   │
│        Makes HTTP requests via REST API           │
└────────────────────────┬─────────────────────────┘
                         │
                         │ GET /users/1 (port 3000)
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│         API GATEWAY (Port 3000)                  │
│  ┌──────────────────────────────────────────┐   │
│  │   CIRCUIT BREAKER MIDDLEWARE             │   │
│  │  • Monitors requests                     │   │
│  │  • Tracks failures                       │   │
│  │  • Manages state transitions             │   │
│  │  • Returns fallback responses            │   │
│  └──────────────────────────────────────────┘   │
└────────────────┬─────────────────────┬───────────┘
                 │                     │
        (CLOSED/HALF-OPEN)        (OPEN)
         Pass through              Fallback
                 │                     │
                 ▼                     ▼
      ┌──────────────────┐    ┌──────────────────┐
      │  USER SERVICE    │    │  ERROR RESPONSE  │
      │  (Port 4001)     │    │  (503 JSON)      │
      │  Returns user    │    │  Service down    │
      │  data            │    │  message         │
      └──────────────────┘    └──────────────────┘
      
      ┌──────────────────┐
      │  ORDER SERVICE   │
      │  (Port 4002)     │
      │  Returns order   │
      │  data            │
      └──────────────────┘
```

---

## Project Structure

```
03_circuit-breaker/
│
├── gateway/
│   ├── server.js              # Main gateway with circuit breaker logic
│   ├── package.json           # Dependencies (express, axios, opossum)
│   └── debug.log
│
├── user/
│   ├── server.js              # User microservice (port 4001)
│   ├── package.json           # Dependencies (express)
│   └── debug.log
│
├── order/
│   ├── server.js              # Order microservice (port 4002)
│   ├── package.json           # Dependencies (express)
│   └── debug.log
│
└── README.md                  # This file
```

### What Each Service Does

| Service | Port | Purpose | Returns |
|---------|------|---------|---------|
| User Service | 4001 | Microservice providing user data | `{id, name, email}` |
| Order Service | 4002 | Microservice providing order data | `{orderId, item, price, status}` |
| Gateway | 3000 | API entry point with circuit breaker | Real data or fallback |

---

## Code Understanding

### 1. Gateway Server Configuration

**File:** `gateway/server.js`

```javascript
const CircuitBreaker = require('opossum');

// Configuration for the circuit breaker
const breakerOptions = {
    timeout: 3000,                    // If request > 3 seconds, fail it
    errorThresholdPercentage: 50,     // Open circuit if 50% fail
    resetTimeout: 10000               // Try recovery after 10 seconds
};
```

**What This Means:**

| Config | Value | Meaning |
|--------|-------|---------|
| timeout | 3000ms | After 3 seconds waiting, treat request as failed |
| errorThresholdPercentage | 50% | If 50% or more recent requests fail, OPEN the circuit |
| resetTimeout | 10000ms | After circuit opens, wait 10 seconds before trying HALF-OPEN state |

### 2. Creating the Circuit Breaker

```javascript
const createBreaker = (serviceUrl, serviceName) => {
    // Step 1: Define the function that makes the actual HTTP call
    const loader = async (path, params = {}) => {
        const response = await axios.get(`${serviceUrl}${path}`, {
            params,
            // Only treat 5xx errors as failures (4xx = client error, not service error)
            validateStatus: (status) => status < 500
        });
        return response.data;
    };

    // Step 2: Create circuit breaker with the loader function
    const breaker = new CircuitBreaker(loader, breakerOptions);

    // Step 3: Define fallback response when circuit is OPEN
    breaker.fallback(() => ({
        error: `${serviceName} is currently unavailable`,
        message: "Please try again later.",
        status: "fallback"
    }));

    // Step 4: Listen to state changes for monitoring
    breaker.on('open', () => 
        console.log(`[ALERT] Circuit for ${serviceName} is OPEN! 🔴`));
    
    breaker.on('close', () => 
        console.log(`[SUCCESS] Circuit for ${serviceName} is CLOSED! ✅`));
    
    breaker.on('halfOpen', () => 
        console.log(`[HALF-OPEN] Circuit for ${serviceName} is HALF-OPEN! ⚡`));

    return breaker;
};
```

**How It Works:**
- `loader` = The actual work (HTTP request to microservice)
- `fallback` = What to return if circuit is open
- `on()` events = Notifications when circuit state changes

### 3. Using the Circuit Breaker

```javascript
// Create breakers for each service
const userBreaker = createBreaker('http://localhost:4001', 'User-Service');
const orderBreaker = createBreaker('http://localhost:4002', 'Order-Service');

// Define API endpoint
app.get('/users/:id', async (req, res) => {
    try {
        // Fire the breaker - it handles the circuit logic automatically
        const result = await userBreaker.fire(`/users/${req.params.id}`);
        
        res.json(result);
    } catch (err) {
        res.status(503).json(err);
    }
});

app.listen(3000, () => 
    console.log('🚀 Gateway with Circuit Breakers on port 3000'));
```

**What `breaker.fire()` Does:**
- If CLOSED: Makes real HTTP call to service
- If OPEN: Returns fallback immediately (no HTTP call)
- If HALF-OPEN: Makes limited test requests

### 4. User Service (Port 4001)

```javascript
const express = require('express');
const app = express();

app.get('/users/:id', (req, res) => {
    console.log("User Service hit!");
    res.json({
        id: req.params.id,
        name: "John Doe",
        email: "john@example.com"
    });
});

app.listen(4001, () => console.log('User Service running on port 4001'));
```

### 5. Order Service (Port 4002)

```javascript
const express = require('express');
const app = express();

app.get('/orders/:id', (req, res) => {
    console.log("Order Service hit!");
    res.json({
        orderId: req.params.id,
        item: "Gaming Laptop",
        price: 1500,
        status: "Shipped"
    });
});

app.listen(4002, () => console.log('Order Service running on port 4002'));
```

---

## Setup & Installation

### Prerequisites
- **Node.js** (v12 or higher)
- **npm** (comes with Node.js)
- **PowerShell** or Command Prompt
- **3-4 Terminal Windows** (one for each service + testing)

### Step 1: Install Dependencies

Open PowerShell and run these commands in order:

```powershell
# Terminal 1: Install User Service dependencies
cd d:\microservice-patterns\03_circuit-breaker\user
npm install

# Terminal 2: Install Order Service dependencies
cd d:\microservice-patterns\03_circuit-breaker\order
npm install

# Terminal 3: Install Gateway dependencies
cd d:\microservice-patterns\03_circuit-breaker\gateway
npm install
```

**Expected Output:**
```
added X packages in Y seconds
```

### Dependencies Explained

**Gateway** (`gateway/package.json`):
- `express` - Web framework for HTTP server
- `axios` - HTTP client to make requests to microservices
- `opossum` - Circuit breaker library

**User & Order Services**:
- `express` - Web framework for HTTP server

---

## Running the Application

### IMPORTANT: Run in Separate Terminals!

You need 3 terminal windows open simultaneously. Each service runs independently.

### Terminal 1: Start User Service (Port 4001)

```powershell
cd d:\microservice-patterns\03_circuit-breaker\user
npm start
```

**Expected Output:**
```
User Service running on port 4001
```

This terminal will show:
- Service startup message
- "User Service hit!" when requests arrive

### Terminal 2: Start Order Service (Port 4002)

```powershell
cd d:\microservice-patterns\03_circuit-breaker\order
npm start
```

**Expected Output:**
```
Order Service running on port 4002
```

### Terminal 3: Start Gateway (Port 3000)

```powershell
cd d:\microservice-patterns\03_circuit-breaker\gateway
npm start
```

**Expected Output:**
```
🚀 Gateway with Multi-Service Circuit Breakers on port 3000
```

### Terminal 4: Testing

Use this terminal to make requests and observe the circuit breaker behavior.

---

## Testing the Circuit Breaker

### Test 1: Normal Operation (All Services Running)

**Make requests while all services are up:**

```powershell
# Get user data through gateway
curl -X GET "http://localhost:3000/users/1"

# Get order data through gateway
curl -X GET "http://localhost:3000/orders/99"
```

**Expected Response:**

User Service:
```json
{
    "id": "1",
    "name": "John Doe",
    "email": "john@example.com"
}
```

Order Service:
```json
{
    "orderId": "99",
    "item": "Gaming Laptop",
    "price": 1500,
    "status": "Shipped"
}
```

**Gateway Console Output:**
```
User Service running on port 4001
Order Service running on port 4002
🚀 Gateway with Multi-Service Circuit Breakers on port 3000
```

---

### Test 2: Simulate Service Failure (Circuit Opens)

**Step 1: Stop User Service**

Go to Terminal 1 and press `Ctrl+C` to stop it.

**Step 2: Make Multiple Requests**

```powershell
# Run this loop in Terminal 4 to trigger circuit breaker
for ($i=1; $i -le 5; $i++) {
    Write-Host "Request $i:" -ForegroundColor Cyan
    curl -X GET "http://localhost:3000/users/1"
    Write-Host ""
    Start-Sleep -Seconds 1
}
```

**What You'll See:**

**Request 1 & 2** - Real Errors (25-50% failure):
```json
{
    "error": "connect ECONNREFUSED 127.0.0.1:4001",
    "status": "500"
}
```

**Request 3, 4, 5** - Fallback Response (Circuit is now OPEN):
```json
{
    "error": "User-Service is currently unavailable",
    "message": "Please try again later.",
    "status": "fallback"
}
```

**Key Difference:**
- Requests 1-2 take ~3 seconds (timeout waiting)
- Requests 3-5 return INSTANTLY (no timeout, circuit is protecting)

**Gateway Console Output:**
```
[ALERT] Circuit for User-Service is OPEN! 🔴
```

---

### Test 3: Automatic Recovery (HALF-OPEN → CLOSED)

**Step 1: Wait for Recovery Timeout**

The circuit has `resetTimeout: 10000` (10 seconds). Wait for this:

```powershell
Start-Sleep -Seconds 12  # Wait 12 seconds
```

**Gateway Console Output (after ~10 seconds):**
```
[HALF-OPEN] Circuit for User-Service is HALF-OPEN! ⚡
```

**Step 2: Restart User Service**

In Terminal 1, run:
```powershell
npm start
```

**Expected Output:**
```
User Service running on port 4001
```

**Step 3: Make a Request**

```powershell
curl -X GET "http://localhost:3000/users/1"
```

**Expected Response:**
```json
{
    "id": "1",
    "name": "John Doe",
    "email": "john@example.com"
}
```

**Gateway Console Output:**
```
[SUCCESS] Circuit for User-Service is CLOSED! ✅
```

**The circuit is now CLOSED and back to normal!**

---

### Test 4: Complete Scenario (Recommended)

This demonstrates the full lifecycle in one go:

```powershell
# In PowerShell Terminal 4

Write-Host "=== PHASE 1: Normal Operation ===" -ForegroundColor Green
Write-Host "Making requests while both services are up..." -ForegroundColor Gray
curl http://localhost:3000/users/1
Write-Host ""
curl http://localhost:3000/orders/99
Write-Host ""

Write-Host "=== PHASE 2: Service Failure ===" -ForegroundColor Yellow
Write-Host "Stopped User Service. Now making 5 rapid requests..." -ForegroundColor Gray
Write-Host ">> Stop User Service in Terminal 1 (Ctrl+C) <<" -ForegroundColor Red
Read-Host "Press ENTER when done"

for ($i=1; $i -le 5; $i++) {
    Write-Host "`nRequest $i:" -ForegroundColor Yellow
    curl http://localhost:3000/users/1
    Start-Sleep -Seconds 0.5
}

Write-Host "`n=== PHASE 3: Circuit State ===" -ForegroundColor Red
Write-Host "Check Gateway Terminal 3:" -ForegroundColor Gray
Write-Host "Should see: [ALERT] Circuit for User-Service is OPEN!" -ForegroundColor Red
Write-Host "`nNotice how requests 3-5 are INSTANT (no 3-second timeout)" -ForegroundColor Cyan
Read-Host "`nPress ENTER to continue"

Write-Host "`n=== PHASE 4: Recovery Period ===" -ForegroundColor Cyan
Write-Host "Waiting 12 seconds for circuit recovery..." -ForegroundColor Gray
Start-Sleep -Seconds 12
Write-Host "Check Gateway Terminal 3 for: [HALF-OPEN] Circuit..." -ForegroundColor Cyan

Write-Host "`n>> Restart User Service in Terminal 1 (npm start) <<" -ForegroundColor Green
Read-Host "Press ENTER when restarted"

Write-Host "`n=== PHASE 5: Recovery Test ===" -ForegroundColor Green
Write-Host "Making request after service restart..." -ForegroundColor Gray
curl http://localhost:3000/users/1

Write-Host "`nCheck Gateway Terminal 3 for:" -ForegroundColor Cyan
Write-Host "[SUCCESS] Circuit for User-Service is CLOSED!" -ForegroundColor Green
```

---

## Visual State Diagrams

### Circuit Breaker State Machine

```
START
  │
  ▼
┌──────────┐
│  CLOSED  │  ✅ Normal operation
│  (Active)│     All requests pass through
└────┬─────┘     
     │
     │ (Failures reach 50% threshold)
     │
     ▼
┌──────────┐
│  OPEN    │  🔴 Fault detected
│ (Blocked)│     Requests blocked
└────┬─────┘     Fallback returned
     │
     │ (Wait resetTimeout = 10 seconds)
     │
     ▼
┌────────────────┐
│  HALF-OPEN     │  ⚡ Recovery testing
│  (Testing)     │     Limited requests allowed
└────┬──────┬────┘
     │      │
     │      │ (Failure)
     │      └─────────┐
     │                │
     │ (Success)      ▼
     │           ┌──────────┐
     │           │  OPEN    │ (Stay open, retry later)
     │           └──────────┘
     │
     ▼
┌──────────┐
│  CLOSED  │ ✅ Back to normal
└──────────┘
```

### Request Journey

**When Circuit is CLOSED:**
```
Request → Gateway → Check Circuit State
                         │
                         ├─ CLOSED? YES
                         │
                         ▼
                    Make HTTP Call
                         │
                         ├─ Timeout after 3s
                         ├─ Get Response
                         │
                         ▼
                    Send to Client ✅
```

**When Circuit is OPEN:**
```
Request → Gateway → Check Circuit State
                         │
                         ├─ OPEN? YES
                         │
                         ▼
                  Execute Fallback
                         │
                         ├─ No HTTP Call (Save resources)
                         ├─ Instant Response (1ms)
                         │
                         ▼
                   Send to Client ✅
                  (Error message)
```

---

## Request Flow Examples

### Example 1: Successful Request (Circuit CLOSED)

```
Timeline:
T=0ms    → Request arrives: GET /users/1
T=1ms    → Check circuit: CLOSED ✅
T=2ms    → Make HTTP call to User Service (localhost:4001)
T=100ms  → Response received
T=105ms  → Response sent to client
         → Total time: 105ms
         → Client gets: {"id":"1","name":"John Doe"...}
```

### Example 2: Failure Request #1 (Still CLOSED)

```
Timeline:
T=0ms    → Request arrives: GET /users/1 (User Service DOWN)
T=1ms    → Check circuit: CLOSED ✅
T=2ms    → Make HTTP call (will fail)
T=3000ms → Timeout reached, request fails ❌
T=3010ms → failure_count = [1,0,0,0] = 25%
T=3015ms → Error sent to client
         → Total time: 3015ms
         → Circuit remains CLOSED (need 50% failures)
```

### Example 3: Failure Request #2 (Threshold Hit → OPEN)

```
Timeline:
T=0ms    → Request arrives: GET /users/1
T=1ms    → Check circuit: CLOSED ✅
T=2ms    → Make HTTP call (will fail)
T=3000ms → Timeout reached ❌
T=3010ms → failure_count = [1,1,0,0] = 50% ← THRESHOLD!
T=3015ms → 🔴 CIRCUIT OPENS!
T=3020ms → breaker.on('open') triggered
T=3025ms → Gateway console: "[ALERT] Circuit for User-Service is OPEN!"
T=3030ms → Error sent to client
         → Total time: 3030ms
```

### Example 4: Request When Circuit OPEN (Fast Fallback)

```
Timeline:
T=0ms    → Request arrives: GET /users/1
T=1ms    → Check circuit: OPEN 🔴
T=2ms    → Don't make HTTP call
T=3ms    → Execute fallback function
T=5ms    → Response sent to client
         → Total time: 5ms (INSTANT!)
         → Client gets: {"error":"User-Service currently unavailable"...}
         → NO TIMEOUT WASTED!
```

### Example 5: Recovery (HALF-OPEN → CLOSED)

```
Timeline:
Circuit opened at: T=3030ms
resetTimeout: 10000ms

T=13030ms → Recovery timeout reached
T=13031ms → 🔴 STATE CHANGE: HALF-OPEN ⚡
T=13032ms → Gateway console: "[HALF-OPEN] Circuit for User-Service is HALF-OPEN!"

User Service restarted by admin

T=13100ms → Request arrives: GET /users/1
T=13101ms → Check circuit: HALF-OPEN ⚡
T=13102ms → Make test HTTP call (limited requests)
T=13200ms → Response received ✅
T=13201ms → Success! Service is back
T=13202ms → 🟢 STATE CHANGE: CLOSED ✅
T=13203ms → Gateway console: "[SUCCESS] Circuit for User-Service is CLOSED!"
T=13204ms → Response sent to client
           → Total time: 104ms
           → failure_count reset to [0,0,0,0]
           → Back to normal operation!
```

---

## Troubleshooting

### Issue 1: "Port Already in Use" Error

**Symptom:**
```
Error: listen EADDRINUSE :::3000
```

**Cause:** Another service is running on that port.

**Solution:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Find process ID and kill it
taskkill /PID <PID> /F

# Or just use different ports (modify server.js)
```

### Issue 2: "ECONNREFUSED" Error

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:4001
```

**Cause:** User Service is not running on port 4001.

**Solution:**
```powershell
# Check if User Service is running
netstat -ano | findstr :4001

# If not running, start it in Terminal 1
cd d:\microservice-patterns\03_circuit-breaker\user
npm start
```

### Issue 3: Circuit Not Opening

**Symptom:** Circuit stays CLOSED even after multiple failures.

**Cause:** Failure threshold not reached (need 50%).

**Solution:**
```powershell
# Make at least 5 rapid requests to ensure >50% failure rate
for ($i=1; $i -le 10; $i++) {
    curl http://localhost:3000/users/1
    Start-Sleep -Milliseconds 100  # Fast requests
}

# Watch Gateway console for [ALERT] message
```

### Issue 4: Requests Still Failing After Restart

**Symptom:** Service restarted but still getting fallback response.

**Cause:** Circuit still in HALF-OPEN or recovery not complete.

**Solution:**
```powershell
# Wait for full recovery timeout
Start-Sleep -Seconds 12

# Make a request to trigger recovery
curl http://localhost:3000/users/1

# Watch for [SUCCESS] in Gateway console
```

### Issue 5: No Console Output

**Symptom:** Services start but no output in terminals.

**Cause:** Service crashed silently or wrong directory.

**Solution:**
```powershell
# Check if node_modules exists
ls d:\microservice-patterns\03_circuit-breaker\user\node_modules

# If not, install dependencies
cd d:\microservice-patterns\03_circuit-breaker\user
npm install

# Try running with verbose output
node server.js
```

### Issue 6: npm: command not found

**Symptom:**
```
npm : The term 'npm' is not recognized
```

**Cause:** Node.js/npm not installed or not in PATH.

**Solution:**
```powershell
# Download from https://nodejs.org/
# Install latest LTS version

# Verify installation
node --version
npm --version

# Close and reopen PowerShell after installation
```

---

## Summary & Key Concepts

### The Three States Explained

| State | Request Handling | Purpose |
|-------|------------------|---------|
| **CLOSED** ✅ | Pass through → Service | Normal operation, service is healthy |
| **OPEN** 🔴 | Block → Fallback | Protect from failing service |
| **HALF-OPEN** ⚡ | Limited test requests | Check if service recovered |

### Failure Detection

```
Request History: [0, 1, 1, 0]
                  Success, Fail, Fail, Success

Failure Rate = 2 out of 4 = 50%
Threshold = 50%

Is 50% >= 50%? YES
→ CIRCUIT OPENS 🔴
```

### Recovery Process

```
Circuit OPEN (10 seconds pass)
         ↓
   HALF-OPEN (try request)
         ↓
Request succeeds? 
         ↓ YES           ↓ NO
    CLOSED ✅         OPEN 🔴
```

### Benefits

✅ **Prevents Cascading Failures** - One bad service doesn't bring down everything  
✅ **Saves Resources** - Stops making requests to dead services  
✅ **Fast Fallback** - Instant response instead of timeout waiting  
✅ **Automatic Recovery** - Tries to recover without manual intervention  
✅ **Graceful Degradation** - Returns error instead of crashing  

---

## Next Steps

1. **Run all 3 services** in separate terminals
2. **Make normal requests** to understand flow
3. **Stop a service** to see circuit open
4. **Observe state transitions** in gateway console
5. **Wait for recovery** to see automatic healing
6. **Modify thresholds** to experiment with behavior

---

## Real-World Applications

- **Netflix** - Uses Hystrix library (circuit breaker framework)
- **AWS** - Auto-scaling and recovery mechanisms
- **Google Cloud** - Service mesh implementations
- **Banking** - Prevent transaction cascades
- **E-commerce** - Maintain availability during traffic spikes

---

## Files Structure Reminder

```
Gateway (3000)
├── Monitors requests
├── Detects failures
├── Manages circuit state
├── Routes to services
└── Returns fallback if needed

User Service (4001)
├── Returns user data
└── Can be stopped to test circuit

Order Service (4002)
├── Returns order data
└── Can be stopped to test circuit
```

---

**🎉 You now understand the Circuit Breaker Pattern! Start testing today!**
