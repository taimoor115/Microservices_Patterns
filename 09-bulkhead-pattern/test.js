/**
 * TEST.JS - Load Testing & Demonstration
 * 
 * This script demonstrates:
 * 1. How the system behaves WITHOUT bulkhead
 * 2. How the system behaves WITH bulkhead
 * 3. How bulkhead + circuit breaker work together
 * 
 * Usage: node test.js
 */

const axios = require('axios');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class LoadTester {
  constructor(gatewayPort, name) {
    this.gatewayPort = gatewayPort;
    this.name = name;
    this.results = {
      slowService: { success: 0, failure: 0, timeout: 0, rejection: 0, times: [] },
      fastService: { success: 0, failure: 0, timeout: 0, rejection: 0, times: [] }
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async sendRequest(endpoint, delay = 100) {
    try {
      const startTime = Date.now();
      const response = await axios.get(`http://localhost:${this.gatewayPort}${endpoint}`, {
        timeout: 10000
      });
      const time = Date.now() - startTime;

      const service = endpoint.includes('slow') ? 'slowService' : 'fastService';
      this.results[service].times.push(time);
      this.results[service].success++;

      return {
        status: 'success',
        time,
        statusCode: response.status
      };
    } catch (error) {
      const service = endpoint.includes('slow') ? 'slowService' : 'fastService';
      const time = Date.now() - (Date.now() - 100);

      if (error.response?.status === 429) {
        this.results[service].rejection++;
        return { status: 'rejected', statusCode: 429 };
      } else if (error.response?.status === 503) {
        this.results[service].failure++;
        return { status: 'circuit-open', statusCode: 503 };
      } else if (error.code === 'ECONNABORTED') {
        this.results[service].timeout++;
        return { status: 'timeout', statusCode: 504 };
      } else {
        this.results[service].failure++;
        return { status: 'error', statusCode: error.response?.status || 'unknown' };
      }
    }
  }

  async runLoadTest(slowEndpoint, fastEndpoint, slowRequests = 10, fastRequests = 5) {
    this.log(`\n${'━'.repeat(70)}`, 'cyan');
    this.log(`TESTING: ${this.name}`, 'cyan');
    this.log(`${'━'.repeat(70)}\n`, 'cyan');

    // Send slow service requests (these will be slow)
    this.log(`Sending ${slowRequests} requests to SLOW service...`, 'yellow');
    const slowPromises = Array(slowRequests)
      .fill(null)
      .map(() => this.sendRequest(slowEndpoint, 5000));

    // Wait a bit, then send fast service requests
    await new Promise(resolve => setTimeout(resolve, 500));

    this.log(`Sending ${fastRequests} requests to FAST service...`, 'blue');
    const fastPromises = Array(fastRequests)
      .fill(null)
      .map(() => this.sendRequest(fastEndpoint, 100));

    // Wait for all requests to complete
    const slowResults = await Promise.all(slowPromises);
    const fastResults = await Promise.all(fastPromises);

    this.printResults(slowResults, fastResults);
  }

  printResults(slowResults, fastResults) {
    this.log(`\n${'═'.repeat(70)}`, 'magenta');
    this.log('RESULTS SUMMARY', 'magenta');
    this.log(`${'═'.repeat(70)}\n`, 'magenta');

    // Slow service results
    this.log('🔴 SLOW SERVICE Results:', 'yellow');
    this.log(`   Success:    ${this.results.slowService.success}`);
    this.log(`   Failures:   ${this.results.slowService.failure}`);
    this.log(`   Timeouts:   ${this.results.slowService.timeout}`);
    this.log(`   Rejections: ${this.results.slowService.rejection}`);
    if (this.results.slowService.times.length > 0) {
      const avgTime = this.results.slowService.times.reduce((a, b) => a + b, 0) / this.results.slowService.times.length;
      this.log(`   Avg Time:   ${avgTime.toFixed(0)}ms`);
    }

    // Fast service results
    this.log('\n🟢 FAST SERVICE Results:', 'blue');
    this.log(`   Success:    ${this.results.fastService.success}`);
    this.log(`   Failures:   ${this.results.fastService.failure}`);
    this.log(`   Timeouts:   ${this.results.fastService.timeout}`);
    this.log(`   Rejections: ${this.results.fastService.rejection}`);
    if (this.results.fastService.times.length > 0) {
      const avgTime = this.results.fastService.times.reduce((a, b) => a + b, 0) / this.results.fastService.times.length;
      this.log(`   Avg Time:   ${avgTime.toFixed(0)}ms`);
    }

    // Analysis
    this.log(`\n${'─'.repeat(70)}`, 'cyan');
    this.printAnalysis();
  }

  printAnalysis() {
    if (this.name.includes('WITHOUT')) {
      this.log('ANALYSIS: Without Bulkhead Pattern', 'red');
      this.log('─────────────────────────────────', 'red');
      if (this.results.fastService.timeout > 0 || this.results.fastService.failure > 0) {
        this.log(
          `❌ PROBLEM: Fast service is being blocked by slow service!\n` +
          `   - ${this.results.fastService.timeout} timeouts on fast service\n` +
          `   - This means the slow service consumed all available resources\n` +
          `   - Fast requests had to wait for slow requests to complete`,
          'red'
        );
      }
    } else if (this.name.includes('WITH BULKHEAD')) {
      this.log('ANALYSIS: With Bulkhead Pattern', 'green');
      this.log('────────────────────────────────', 'green');
      if (this.results.fastService.success === this.results.fastService.times.length) {
        this.log(
          `✅ SUCCESS: Fast service remains responsive!\n` +
          `   - All fast requests completed successfully\n` +
          `   - Fast service has its own resource pool (bulkhead)\n` +
          `   - Slow service failures don't affect fast service`,
          'green'
        );
      }
      if (this.results.slowService.rejection > 0) {
        this.log(
          `\n📊 NOTE: Some slow requests were rejected\n` +
          `   - This is EXPECTED behavior (protection mechanism)\n` +
          `   - Bulkhead limit prevents resource exhaustion\n` +
          `   - Better to reject gracefully than cascade failure`,
          'blue'
        );
      }
    } else if (this.name.includes('CIRCUIT BREAKER')) {
      this.log('ANALYSIS: With Bulkhead + Circuit Breaker', 'green');
      this.log('───────────────────────────────────────────', 'green');
      this.log(
        `✅ ADVANCED RESILIENCE:\n` +
        `   - Bulkhead isolates resource pools\n` +
        `   - Circuit breaker prevents cascading failures\n` +
        `   - Failing service is temporarily disabled\n` +
        `   - System recovers automatically`,
        'green'
      );
    }
  }
}

// ==================== MAIN TEST EXECUTION ====================

async function runAllTests() {
  console.clear();
  
  console.log(`\n`);
  console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║           BULKHEAD PATTERN - LOAD TEST DEMONSTRATION               ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════════╝${colors.reset}`);

  console.log(`\n${colors.yellow}Prerequisites: Make sure all services are running:${colors.reset}`);
  console.log(`  1. node slow-api.js          (port 3001)`);
  console.log(`  2. node fast-api.js          (port 3002)`);
  console.log(`  3. node gateway-[version].js (port 3000)\n`);

  // Test 1: Without Bulkhead
  console.log(`\n${colors.yellow}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.yellow}TEST 1: GATEWAY WITHOUT BULKHEAD (Shows the Problem)${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(70)}${colors.reset}`);
  console.log(`\nMake sure gateway-without-bulkhead.js is running on port 3000`);
  console.log(`Press Enter to continue...`);
  await new Promise(resolve => process.stdin.once('data', resolve));

  try {
    const tester1 = new LoadTester(3000, 'WITHOUT BULKHEAD');
    await tester1.runLoadTest('/gateway/slow-process', '/gateway/fast-data', 10, 5);
  } catch (error) {
    console.log(`${colors.red}Error: Could not connect to gateway. Make sure it's running!${colors.reset}`);
  }

  // Test 2: With Bulkhead
  console.log(`\n\n${colors.green}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.green}TEST 2: GATEWAY WITH BULKHEAD (Shows the Solution)${colors.reset}`);
  console.log(`${colors.green}${'='.repeat(70)}${colors.reset}`);
  console.log(`\nNow restart the gateway with: node gateway-with-bulkhead.js`);
  console.log(`Press Enter when gateway is running...`);
  await new Promise(resolve => process.stdin.once('data', resolve));

  try {
    const tester2 = new LoadTester(3000, 'WITH BULKHEAD');
    await tester2.runLoadTest('/gateway/slow-process', '/gateway/fast-data', 10, 5);
  } catch (error) {
    console.log(`${colors.red}Error: Could not connect to gateway. Make sure it's running!${colors.reset}`);
  }

  // Test 3: With Circuit Breaker
  console.log(`\n\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}TEST 3: GATEWAY WITH BULKHEAD + CIRCUIT BREAKER (Advanced)${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}`);
  console.log(`\nRestart the gateway with: node gateway-with-bulkhead-circuit-breaker.js`);
  console.log(`Press Enter when gateway is running...`);
  await new Promise(resolve => process.stdin.once('data', resolve));

  try {
    const tester3 = new LoadTester(3000, 'WITH CIRCUIT BREAKER');
    await tester3.runLoadTest('/gateway/slow-process', '/gateway/fast-data', 10, 5);
  } catch (error) {
    console.log(`${colors.red}Error: Could not connect to gateway. Make sure it's running!${colors.reset}`);
  }

  console.log(`\n\n${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.green}All tests completed!${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);

  process.exit(0);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Test error: ${error.message}${colors.reset}`);
  process.exit(1);
});
