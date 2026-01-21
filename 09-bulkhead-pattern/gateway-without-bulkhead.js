/**
 * GATEWAY WITHOUT BULKHEAD - Shows the Problem
 * 
 * PROBLEM DEMONSTRATION:
 * - All requests share the same thread pool
 * - If slow service blocks, it blocks ALL requests
 * - Fast service also gets blocked by slow service
 * - Cascading failure occurs
 * 
 * Run this server on port 3000
 * Send concurrent requests to observe thread pool exhaustion
 */

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json());

// Metrics for monitoring
const metrics = {
  totalRequests: 0,
  slowServiceRequests: 0,
  fastServiceRequests: 0,
  slowServiceSuccess: 0,
  slowServiceFailure: 0,
  fastServiceSuccess: 0,
  fastServiceFailure: 0,
  failedDueToTimeout: 0
};

// WITHOUT BULKHEAD - ALL requests share the same connection pool
// This is the default behavior and shows the problem
console.log('\n⚠️  GATEWAY WITHOUT BULKHEAD');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Issue: All requests compete for same resources');
console.log('Result: Slow service blocks fast service\n');

// Endpoint that calls slow API (third-party service)
app.get('/gateway/slow-process', async (req, res) => {
  metrics.totalRequests++;
  metrics.slowServiceRequests++;
  
  const startTime = Date.now();
  
  try {
    // This request uses the shared thread pool
    // If many slow requests are pending, fast requests will also timeout
    const response = await axios.get('http://localhost:3001/api/process', {
      params: {
        delay: 5000,  // 5 seconds delay
        failRate: 0.1  // 10% failure rate
      },
      timeout: 6000
    });
    
    metrics.slowServiceSuccess++;
    res.json({
      status: 'success',
      service: 'slow-api',
      responseTime: `${Date.now() - startTime}ms`,
      data: response.data
    });
  } catch (error) {
    metrics.slowServiceFailure++;
    
    if (error.code === 'ECONNABORTED') {
      metrics.failedDueToTimeout++;
      res.status(504).json({
        status: 'timeout',
        service: 'slow-api',
        message: 'Request timeout - thread pool exhausted',
        responseTime: `${Date.now() - startTime}ms`
      });
    } else {
      res.status(503).json({
        status: 'error',
        service: 'slow-api',
        message: error.message,
        responseTime: `${Date.now() - startTime}ms`
      });
    }
  }
});

// Endpoint that calls fast API (internal service)
app.get('/gateway/fast-data', async (req, res) => {
  metrics.totalRequests++;
  metrics.fastServiceRequests++;
  
  const startTime = Date.now();
  
  try {
    // Even though this should be fast, it will timeout if thread pool is exhausted
    // by slow service requests
    const response = await axios.get('http://localhost:3002/api/data', {
      timeout: 3000  // 3 second timeout for fast service
    });
    
    metrics.fastServiceSuccess++;
    res.json({
      status: 'success',
      service: 'fast-api',
      responseTime: `${Date.now() - startTime}ms`,
      data: response.data
    });
  } catch (error) {
    metrics.fastServiceFailure++;
    
    if (error.code === 'ECONNABORTED') {
      metrics.failedDueToTimeout++;
      res.status(504).json({
        status: 'timeout',
        service: 'fast-api',
        message: 'Request timeout - thread pool exhausted by slow service!',
        responseTime: `${Date.now() - startTime}ms`
      });
    } else {
      res.status(503).json({
        status: 'error',
        service: 'fast-api',
        message: error.message,
        responseTime: `${Date.now() - startTime}ms`
      });
    }
  }
});

// Metrics endpoint
app.get('/gateway/metrics', (req, res) => {
  res.json({
    title: 'GATEWAY WITHOUT BULKHEAD - Metrics',
    warning: 'Notice how slow service failures affect fast service availability',
    metrics
  });
});

// Health check
app.get('/gateway/health', (req, res) => {
  res.json({ status: 'healthy', pattern: 'without-bulkhead' });
});

app.listen(PORT, () => {
  console.log(`\n🔵 GATEWAY (WITHOUT BULKHEAD) running on http://localhost:${PORT}`);
  console.log(`   GET /gateway/slow-process (calls 5s slow service)`);
  console.log(`   GET /gateway/fast-data (calls 100ms fast service)`);
  console.log(`   GET /gateway/metrics (view request statistics)`);
  console.log(`\n💡 TEST: Send 10+ concurrent requests to /gateway/slow-process`);
  console.log(`   Then try /gateway/fast-data - it will timeout!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

module.exports = app;
