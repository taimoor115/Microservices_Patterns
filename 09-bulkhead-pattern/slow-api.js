/**
 * SLOW API - Simulates a Third-Party Service (Like Payment Gateway, Email Service, etc.)
 * This API intentionally has slow response times and can sometimes fail
 */

const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

// Simulate slow database or external API calls
app.get('/api/process', (req, res) => {
  const { delay = 5000, failRate = 0 } = req.query;
  const delayTime = parseInt(delay);
  
  // Simulate random failures based on failRate parameter
  if (Math.random() < parseFloat(failRate)) {
    return res.status(500).json({
      status: 'failed',
      message: 'Third-party service temporarily unavailable',
      timestamp: new Date()
    });
  }

  // Simulate long processing time
  setTimeout(() => {
    res.json({
      status: 'success',
      service: 'slow-api',
      data: {
        processedAt: new Date(),
        delayTime: delayTime,
        result: `Processed after ${delayTime}ms`
      }
    });
  }, delayTime);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'slow-api', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`\n🔴 SLOW API SERVER running on http://localhost:${PORT}`);
  console.log(`   Simulates slow third-party services (Payment, Email, etc.)`);
  console.log(`   Default delay: 5000ms`);
  console.log(`   GET /api/process?delay=5000&failRate=0.1 (10% failure rate)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

module.exports = app;
