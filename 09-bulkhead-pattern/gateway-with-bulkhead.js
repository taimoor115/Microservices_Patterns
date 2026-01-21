/**
 * BULKHEAD PATTERN IMPLEMENTATION
 * 
 * SOLUTION:
 * - Separate thread pools for different services
 * - Isolate resource-intensive operations
 * - Slow service can't block fast service
 * - Graceful degradation instead of cascading failure
 * 
 * How it works:
 * - Each external service gets its own connection pool (bulkhead)
 * - Limits on concurrent requests per service
 * - Failures are isolated to specific service
 */

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json());

// ==================== BULKHEAD IMPLEMENTATION ====================

class Bulkhead {
  constructor(name, maxConcurrent = 5, maxQueue = 20) {
    this.name = name;
    this.maxConcurrent = maxConcurrent;
    this.maxQueue = maxQueue;
    this.activeRequests = 0;
    this.queuedRequests = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
  }

  async execute(fn) {
    this.metrics.totalRequests++;

    // Check if we've hit the queue limit
    if (this.activeRequests >= this.maxConcurrent && this.queuedRequests.length >= this.maxQueue) {
      this.metrics.rejectedRequests++;
      throw new Error(`Bulkhead '${this.name}' is at capacity (concurrent: ${this.activeRequests}/${this.maxConcurrent}, queued: ${this.queuedRequests.length}/${this.maxQueue})`);
    }

    // If at max concurrent, queue the request
    if (this.activeRequests >= this.maxConcurrent) {
      await new Promise(resolve => this.queuedRequests.push(resolve));
    }

    this.activeRequests++;

    try {
      const startTime = Date.now();
      const result = await fn();
      const responseTime = Date.now() - startTime;
      
      this.metrics.successfulRequests++;
      this.metrics.responseTimes.push(responseTime);
      this.metrics.averageResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
      
      return result;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    } finally {
      this.activeRequests--;
      const resolve = this.queuedRequests.shift();
      if (resolve) resolve();
    }
  }

  getStatus() {
    return {
      name: this.name,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
      queuedRequests: this.queuedRequests.length,
      maxQueue: this.maxQueue,
      metrics: this.metrics
    };
  }
}

// ==================== CREATE SEPARATE BULKHEADS ====================

// Bulkhead for slow service - limited resources since it's slow
const slowServiceBulkhead = new Bulkhead('slow-service', 5, 10);

// Bulkhead for fast service - more resources since it's fast
const fastServiceBulkhead = new Bulkhead('fast-service', 20, 50);

// Metrics aggregator
const allMetrics = {
  totalRequests: 0,
  slowServiceRequests: 0,
  fastServiceRequests: 0,
  slowServiceSuccess: 0,
  slowServiceFailure: 0,
  fastServiceSuccess: 0,
  fastServiceFailure: 0,
  bulkheadRejections: 0
};

console.log('\n✅ GATEWAY WITH BULKHEAD PATTERN');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Benefit: Slow service isolated from fast service');
console.log('Result: Fast service remains responsive\n');

// Endpoint for slow API (with bulkhead protection)
app.get('/gateway/slow-process', async (req, res) => {
  allMetrics.totalRequests++;
  allMetrics.slowServiceRequests++;
  
  const startTime = Date.now();

  try {
    // Execute within the slow service bulkhead
    const result = await slowServiceBulkhead.execute(async () => {
      return await axios.get('http://localhost:3001/api/process', {
        params: {
          delay: 5000,
          failRate: 0.1
        },
        timeout: 6000
      });
    });

    allMetrics.slowServiceSuccess++;
    res.json({
      status: 'success',
      service: 'slow-api',
      pattern: 'bulkhead',
      responseTime: `${Date.now() - startTime}ms`,
      data: result.data
    });
  } catch (error) {
    allMetrics.slowServiceFailure++;

    if (error.message.includes("Bulkhead")) {
      allMetrics.bulkheadRejections++;
      res.status(429).json({
        status: 'rejected',
        service: 'slow-api',
        pattern: 'bulkhead',
        message: 'Too many requests to slow service - bulkhead limit reached',
        responseTime: `${Date.now() - startTime}ms`
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        status: 'timeout',
        service: 'slow-api',
        message: 'Request timeout',
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

// Endpoint for fast API (with bulkhead protection)
app.get('/gateway/fast-data', async (req, res) => {
  allMetrics.totalRequests++;
  allMetrics.fastServiceRequests++;
  
  const startTime = Date.now();

  try {
    // Execute within the fast service bulkhead
    const result = await fastServiceBulkhead.execute(async () => {
      return await axios.get('http://localhost:3002/api/data', {
        timeout: 3000
      });
    });

    allMetrics.fastServiceSuccess++;
    res.json({
      status: 'success',
      service: 'fast-api',
      pattern: 'bulkhead',
      responseTime: `${Date.now() - startTime}ms`,
      data: result.data
    });
  } catch (error) {
    allMetrics.fastServiceFailure++;

    if (error.message.includes("Bulkhead")) {
      allMetrics.bulkheadRejections++;
      res.status(429).json({
        status: 'rejected',
        service: 'fast-api',
        message: 'Too many requests to fast service - bulkhead limit reached',
        responseTime: `${Date.now() - startTime}ms`
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        status: 'timeout',
        service: 'fast-api',
        message: 'Request timeout',
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
    title: 'GATEWAY WITH BULKHEAD - Metrics',
    explanation: 'Notice how fast service remains responsive even when slow service is saturated',
    allMetrics,
    bulkheads: {
      slowService: slowServiceBulkhead.getStatus(),
      fastService: fastServiceBulkhead.getStatus()
    }
  });
});

// Health check
app.get('/gateway/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    pattern: 'bulkhead',
    bulkheads: {
      slowService: slowServiceBulkhead.getStatus(),
      fastService: fastServiceBulkhead.getStatus()
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n🔵 GATEWAY (WITH BULKHEAD) running on http://localhost:${PORT}`);
  console.log(`   Slow Service Bulkhead: ${slowServiceBulkhead.maxConcurrent} concurrent, ${slowServiceBulkhead.maxQueue} queue`);
  console.log(`   Fast Service Bulkhead: ${fastServiceBulkhead.maxConcurrent} concurrent, ${fastServiceBulkhead.maxQueue} queue`);
  console.log(`\n   GET /gateway/slow-process (calls 5s slow service)`);
  console.log(`   GET /gateway/fast-data (calls 100ms fast service)`);
  console.log(`   GET /gateway/metrics (view request statistics)`);
  console.log(`   GET /gateway/health (check bulkhead status)`);
  console.log(`\n💡 TEST: Send 10+ concurrent requests to /gateway/slow-process`);
  console.log(`   Then try /gateway/fast-data - it WILL respond quickly!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

module.exports = app;
