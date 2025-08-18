import https from 'https';
import http from 'http';

class LoadTester {
  constructor(targetUrl, options = {}) {
    this.targetUrl = targetUrl;
    this.options = {
      concurrent: options.concurrent || 10,
      duration: options.duration || 60, // seconds
      requestsPerSecond: options.requestsPerSecond || 50,
      timeout: options.timeout || 10000,
      ...options
    };
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      statusCodes: {},
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  async makeRequest() {
    return new Promise((resolve) => {
      const url = new URL(this.targetUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const startTime = Date.now();
      
      const req = client.request(url, {
        method: 'GET',
        timeout: this.options.timeout,
        headers: {
          'User-Agent': 'LoadTester/1.0',
          'Accept': 'application/json',
          'Connection': 'keep-alive'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          this.stats.responseTimes.push(responseTime);
          this.stats.statusCodes[res.statusCode] = (this.stats.statusCodes[res.statusCode] || 0) + 1;
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.stats.successfulRequests++;
          } else {
            this.stats.failedRequests++;
            this.stats.errors.push({
              statusCode: res.statusCode,
              responseTime,
              timestamp: new Date().toISOString()
            });
          }
          
          resolve({ statusCode: res.statusCode, responseTime, data });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        this.stats.failedRequests++;
        this.stats.errors.push({
          error: error.message,
          responseTime,
          timestamp: new Date().toISOString()
        });
        resolve({ error: error.message, responseTime });
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        this.stats.failedRequests++;
        this.stats.errors.push({
          error: 'Request timeout',
          responseTime,
          timestamp: new Date().toISOString()
        });
        resolve({ error: 'Request timeout', responseTime });
      });

      req.end();
    });
  }

  async runConcurrentRequests(count) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.makeRequest());
    }
    return Promise.all(promises);
  }

  async start() {
    console.log(`🚀 Starting load test for: ${this.targetUrl}`);
    console.log(`📊 Configuration:`);
    console.log(`   - Concurrent requests: ${this.options.concurrent}`);
    console.log(`   - Duration: ${this.options.duration} seconds`);
    console.log(`   - Target RPS: ${this.options.requestsPerSecond}`);
    console.log(`   - Timeout: ${this.options.timeout}ms`);
    console.log('');

    this.stats.startTime = Date.now();
    
    const interval = 1000 / this.options.requestsPerSecond;
    const endTime = Date.now() + (this.options.duration * 1000);
    
    let requestCount = 0;
    
    while (Date.now() < endTime) {
      const batchStart = Date.now();
      
      // Calculate how many requests to make in this batch
      const requestsThisBatch = Math.min(
        this.options.concurrent,
        this.options.requestsPerSecond
      );
      
      await this.runConcurrentRequests(requestsThisBatch);
      requestCount += requestsThisBatch;
      
      // Progress update every 5 seconds
      if (requestCount % (this.options.requestsPerSecond * 5) === 0) {
        const elapsed = (Date.now() - this.stats.startTime) / 1000;
        const currentRPS = requestCount / elapsed;
        console.log(`⏱️  Progress: ${elapsed.toFixed(1)}s elapsed, ${requestCount} requests sent, ${currentRPS.toFixed(1)} RPS`);
      }
      
      // Rate limiting
      const batchTime = Date.now() - batchStart;
      const sleepTime = Math.max(0, interval - batchTime);
      if (sleepTime > 0) {
        await new Promise(resolve => setTimeout(resolve, sleepTime));
      }
    }
    
    this.stats.endTime = Date.now();
    this.stats.totalRequests = requestCount;
  }

  generateReport() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    const avgResponseTime = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
    const sortedResponseTimes = [...this.stats.responseTimes].sort((a, b) => a - b);
    
    const p50 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.5)];
    const p90 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.9)];
    const p95 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)];
    const p99 = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)];
    
    const actualRPS = this.stats.totalRequests / duration;
    const successRate = (this.stats.successfulRequests / this.stats.totalRequests) * 100;
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 LOAD TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`🎯 Target URL: ${this.targetUrl}`);
    console.log(`⏱️  Test Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📊 Total Requests: ${this.stats.totalRequests.toLocaleString()}`);
    console.log(`✅ Successful: ${this.stats.successfulRequests.toLocaleString()}`);
    console.log(`❌ Failed: ${this.stats.failedRequests.toLocaleString()}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`🚀 Actual RPS: ${actualRPS.toFixed(2)}`);
    console.log('');
    
    console.log('⏱️  RESPONSE TIME STATISTICS');
    console.log('-'.repeat(40));
    console.log(`📊 Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`📈 Median (P50): ${p50.toFixed(2)}ms`);
    console.log(`📊 90th Percentile (P90): ${p90.toFixed(2)}ms`);
    console.log(`📊 95th Percentile (P95): ${p95.toFixed(2)}ms`);
    console.log(`📊 99th Percentile (P99): ${p99.toFixed(2)}ms`);
    console.log(`⚡ Min: ${Math.min(...this.stats.responseTimes).toFixed(2)}ms`);
    console.log(`🐌 Max: ${Math.max(...this.stats.responseTimes).toFixed(2)}ms`);
    console.log('');
    
    console.log('📋 STATUS CODE DISTRIBUTION');
    console.log('-'.repeat(40));
    Object.entries(this.stats.statusCodes)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([code, count]) => {
        const percentage = (count / this.stats.totalRequests * 100).toFixed(2);
        console.log(`${code}: ${count.toLocaleString()} (${percentage}%)`);
      });
    console.log('');
    
    if (this.stats.errors.length > 0) {
      console.log('❌ ERROR ANALYSIS');
      console.log('-'.repeat(40));
      const errorTypes = {};
      this.stats.errors.forEach(error => {
        const type = error.error || `HTTP ${error.statusCode}`;
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });
      
      Object.entries(errorTypes)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`${type}: ${count} occurrences`);
        });
      console.log('');
    }
    
    // Performance assessment
    console.log('🎯 PERFORMANCE ASSESSMENT');
    console.log('-'.repeat(40));
    
    let assessment = '🟢 EXCELLENT';
    let issues = [];
    
    if (successRate < 95) {
      assessment = '🔴 POOR';
      issues.push(`Low success rate (${successRate.toFixed(2)}%)`);
    } else if (successRate < 99) {
      assessment = '🟡 GOOD';
      issues.push(`Success rate could be better (${successRate.toFixed(2)}%)`);
    }
    
    if (avgResponseTime > 2000) {
      assessment = '🔴 POOR';
      issues.push(`High average response time (${avgResponseTime.toFixed(2)}ms)`);
    } else if (avgResponseTime > 1000) {
      assessment = '🟡 GOOD';
      issues.push(`Response time could be optimized (${avgResponseTime.toFixed(2)}ms)`);
    }
    
    if (p95 > 5000) {
      assessment = '🔴 POOR';
      issues.push(`High 95th percentile response time (${p95.toFixed(2)}ms)`);
    }
    
    if (actualRPS < this.options.requestsPerSecond * 0.8) {
      assessment = '🔴 POOR';
      issues.push(`Server cannot handle target load (${actualRPS.toFixed(2)} RPS vs ${this.options.requestsPerSecond} target)`);
    }
    
    console.log(`Overall Assessment: ${assessment}`);
    if (issues.length > 0) {
      console.log('Issues identified:');
      issues.forEach(issue => console.log(`  • ${issue}`));
    } else {
      console.log('✅ No significant issues detected');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Configuration
const config = {
  targetUrl: 'https://taxi.aktau-go.kz/',
  concurrent: 20,
  duration: 120, // 2 minutes
  requestsPerSecond: 100,
  timeout: 10000
};

async function runLoadTest() {
  const tester = new LoadTester(config.targetUrl, config);
  
  try {
    await tester.start();
    tester.generateReport();
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
  }
}

// Run the test
runLoadTest(); 