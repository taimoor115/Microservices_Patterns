const express = require('express');
const proxy = require('express-http-proxy');
const app = express();


app.use((req, res, next) => {
    console.log(`[Gateway]: Request received for ${req.url}`);
    next();
});


app.use((req, res, next) => {
    const apiKey = req.headers['api-key'];
    if (apiKey === 'secret123') {
        next();
    } else {
        res.status(401).send("Unauthorized: Invalid API Key");
    }
});


app.use('/users', proxy('http://localhost:4001', {
    proxyReqPathResolver: function (req) {
        return req.originalUrl;
    }
}));
app.use('/orders', proxy('http://localhost:4002', {
    proxyReqPathResolver: function (req) {
        return req.originalUrl;
    }
}));
app.listen(3000, () => {
    console.log('API Gateway is running on port 3000');
});