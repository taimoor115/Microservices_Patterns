/**
 * ADVANCED: BULKHEAD + CIRCUIT BREAKER PATTERN COMBINED
 * 
 * Combines two powerful resilience patterns:
 * 1. BULKHEAD: Isolates resources for different services
 * 2. CIRCUIT BREAKER: Prevents cascading failures by stopping calls to failing services
 * 
 * How it works together:
 * - Bulkhead limits concurrent requests per service
 * - Circuit breaker detects failing services and stops sending requests
 * - When circuit opens, bulkhead can reject with "circuit open" message
 * - Prevents wasting resources on a service that's already failing
 */

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json());

// ==================== CIRCUIT BREAKER ====================

class CircuitBreaker {
  constructor(name, threshold = 5, timeout = 30000) {
    this.name = name;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.failureThreshold = threshold;
    this.nextAttempt = Date.now();
    this.timeout = timeout;
    this.successCount = 0;
    this.metrics = {
      totalAttempts: 0,
      totalFailures: 0,
      totalRejections: 0,
      stateChanges: []
    };
  }

  async execute(fn) {
    this.metrics.totalAttempts++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        this.metrics.totalRejections++;
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
      this.changeState('HALF_OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.changeState('CLOSED');
    }
  }

  onFailure() {
    this.metrics.totalFailures++;
    this.failureCount++;

    if (this.failureCount >= this.failureThreshold) {
      this.changeState('OPEN');
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  changeState(newState) {
    console.log(`  ⚡ Circuit Breaker '${this.name}': ${this.state} → ${newState}`);
    this.state = newState;
    this.metrics.stateChanges.push({
      state: newState,
      timestamp: new Date()
    });
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt) : null,
      metrics: this.metrics
    };
  }
}

// ==================== BULKHEAD ====================

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

    if (this.activeRequests >= this.maxConcurrent && this.queuedRequests.length >= this.maxQueue) {
      this.metrics.rejectedRequests++;
      throw new Error(`Bulkhead '${this.name}' is at capacity`);
    }

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

// ==================== CREATE INSTANCES ====================

// Slow Service: Bulkhead + Circuit Breaker
const slowBulkhead = new Bulkhead('slow-service', 5, 10);
const slowCircuitBreaker = new CircuitBreaker('slow-service', 3, 20000);

// Fast Service: Bulkhead + Circuit Breaker
const fastBulkhead = new Bulkhead('fast-service', 20, 50);
const fastCircuitBreaker = new CircuitBreaker('fast-service', 5, 20000);

console.log('\n🚀 GATEWAY WITH BULKHEAD + CIRCUIT BREAKER');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Combined patterns for maximum resilience!');
console.log('- Bulkhead: Isolates resources');
console.log('- Circuit Breaker: Prevents cascading failures\n');

// Endpoint for slow API (with bulkhead + circuit breaker)
app.get('/gateway/slow-process', async (req, res) => {
  const startTime = Date.now();

  try {
    const result = await slowCircuitBreaker.execute(async () => {
      return await slowBulkhead.execute(async () => {
        return await axios.get('http://localhost:3001/api/process', {
          params: {
            delay: 5000,
            failRate: 0.2  // Higher failure rate to trigger circuit breaker
          },
          timeout: 6000
        });
      });
    });

    res.json({
      status: 'success',
      service: 'slow-api',
      pattern: 'bulkhead + circuit-breaker',
      responseTime: `${Date.now() - startTime}ms`,
      data: result.data
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error.message.includes('Circuit breaker')) {
      res.status(503).json({
        status: 'circuit-open',
        service: 'slow-api',
        message: 'Service unavailable - circuit breaker is open (too many failures)',
        responseTime: `${responseTime}ms`,
        circuitBreakerState: slowCircuitBreaker.state
      });
    } else if (error.message.includes('Bulkhead')) {
      res.status(429).json({
        status: 'bulkhead-rejected',
        service: 'slow-api',
        message: 'Too many concurrent requests - bulkhead limit reached',
        responseTime: `${responseTime}ms`
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        status: 'timeout',
        service: 'slow-api',
        message: 'Request timeout',
        responseTime: `${responseTime}ms`
      });
    } else {
      res.status(503).json({
        status: 'error',
        service: 'slow-api',
        message: error.message,
        responseTime: `${responseTime}ms`
      });
    }
  }
});

// Endpoint for fast API (with bulkhead + circuit breaker)
app.get('/gateway/fast-data', async (req, res) => {
  const startTime = Date.now();

  try {
    const result = await fastCircuitBreaker.execute(async () => {
      return await fastBulkhead.execute(async () => {
        return await axios.get('http://localhost:3002/api/data', {
          timeout: 3000
        });
      });
    });

    res.json({
      status: 'success',
      service: 'fast-api',
      pattern: 'bulkhead + circuit-breaker',
      responseTime: `${Date.now() - startTime}ms`,
      data: result.data
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error.message.includes('Circuit breaker')) {
      res.status(503).json({
        status: 'circuit-open',
        service: 'fast-api',
        message: 'Service unavailable - circuit breaker is open',
        responseTime: `${responseTime}ms`,
        circuitBreakerState: fastCircuitBreaker.state
      });
    } else if (error.message.includes('Bulkhead')) {
      res.status(429).json({
        status: 'bulkhead-rejected',
        service: 'fast-api',
        message: 'Too many concurrent requests - bulkhead limit reached',
        responseTime: `${responseTime}ms`
      });
    } else {
      res.status(503).json({
        status: 'error',
        service: 'fast-api',
        message: error.message,
        responseTime: `${responseTime}ms`
      });
    }
  }
});

// Metrics endpoint
app.get('/gateway/metrics', (req, res) => {
  res.json({
    title: 'COMBINED PATTERNS - Bulkhead + Circuit Breaker',
    explanation: 'Notice how circuit breaker prevents wasted requests to failing services',
    bulkheads: {
      slowService: slowBulkhead.getStatus(),
      fastService: fastBulkhead.getStatus()
    },
    circuitBreakers: {
      slowService: slowCircuitBreaker.getStatus(),
      fastService: fastCircuitBreaker.getStatus()
    }
  });
});

// Health check
app.get('/gateway/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    pattern: 'bulkhead + circuit-breaker',
    bulkheads: {
      slowService: slowBulkhead.getStatus(),
      fastService: fastBulkhead.getStatus()
    },
    circuitBreakers: {
      slowService: slowCircuitBreaker.getStatus(),
      fastService: fastCircuitBreaker.getStatus()
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n🔵 GATEWAY (BULKHEAD + CIRCUIT BREAKER) running on http://localhost:${PORT}`);
  console.log(`\n   GET /gateway/slow-process`);
  console.log(`   GET /gateway/fast-data`);
  console.log(`   GET /gateway/metrics`);
  console.log(`   GET /gateway/health`);
  console.log(`\n💡 Watch console for circuit breaker state changes!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

module.exports = app;
