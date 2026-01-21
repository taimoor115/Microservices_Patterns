/**
 * FAST API - Simulates Internal Service
 * This API responds quickly with minimal latency
 */

const express = require('express');
const app = express();
const PORT = 3002;

app.use(express.json());

// Quick response endpoint
app.get('/api/data', (req, res) => {
  // Simulate minimal processing (100-200ms)
  setTimeout(() => {
    res.json({
      status: 'success',
      service: 'fast-api',
      data: {
        responseTime: 100,
        timestamp: new Date(),
        message: 'Data retrieved successfully'
      }
    });
  }, 100);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'fast-api', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`\n🟢 FAST API SERVER running on http://localhost:${PORT}`);
  console.log(`   Simulates fast internal services`);
  console.log(`   Response time: ~100ms`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

module.exports = app;
