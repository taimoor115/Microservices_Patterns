const express = require('express');
const axios = require('axios');
const CircuitBreaker = require('opossum');

const app = express();
app.use(express.json());

const breakerOptions = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000
};


const createBreaker = (serviceUrl, serviceName) => {
    const loader = async (path, params = {}) => {
        // Axios ko boleinh ki 404 par error throw na kare (validateStatus)
        const response = await axios.get(`${serviceUrl}${path}`, {
            params,
            validateStatus: (status) => status < 500 // Sirf 500+ errors circuit trip karenge
        });
        return response.data;
    };

    const breaker = new CircuitBreaker(loader, breakerOptions);

    // Fallback: Jab circuit sach mein open ho
    breaker.fallback(() => ({
        error: `${serviceName} is currently unavailable`,
        message: "Please try again later.",
        status: "fallback"
    }));

    // Logs for Monitoring
    breaker.on('open', () => console.log(`[ALERT] Circuit for ${serviceName} is OPEN!`));
    breaker.on('close', () => console.log(`[SUCCESS] Circuit for ${serviceName} is CLOSED!`));
    breaker.on('halfOpen', () => console.log(`[HALF-OPEN] Circuit for ${serviceName} is HALF-OPEN!`));

    return breaker;
};

const userBreaker = createBreaker('http://localhost:4001', 'User-Service');
const orderBreaker = createBreaker('http://localhost:4002', 'Order-Service');




app.get('/users/:id', async (req, res) => {
    try {
        const result = await userBreaker.fire(`/users/${req.params.id}`);
        res.json(result);
    } catch (err) {
        res.status(503).json(err);
    }
});


app.get('/orders/:id', async (req, res) => {
    try {
        const result = await orderBreaker.fire(`/orders/${req.params.id}`);
        res.json(result);
    } catch (err) {
        res.status(503).json(err);
    }
});

app.listen(3000, () => console.log('🚀 Gateway with Multi-Service Circuit Breakers on port 3000'));