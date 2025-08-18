import https from 'https';
import http from 'http';
import fs from 'fs';

class AdvancedLoadTester {
  constructor(targetUrl) {
    this.targetUrl = targetUrl;
    this.results = [];
  }

  async makeRequest(timeout = 10000) {
    return new Promise((resolve) => {
      const url = new URL(this.targetUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const startTime = Date.now();
      
      const req = client.request(url, {
        method: 'GET',
        timeout: timeout,
        headers: {
          'User-Agent': 'AdvancedLoadTester/1.0',
          'Accept': 'application/json',
          'Connection': 'keep-alive'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            responseTime,
            success: res.statusCode >= 200 && res.statusCode < 300,
            dataLength: data.length,
            timestamp: new Date().toISOString()
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          error: error.message,
          responseTime,
          success: false,
          timestamp: new Date().toISOString()
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        resolve({
          error: 'Request timeout',
          responseTime,
          success: false,
          timestamp: new Date().toISOString()
        });
      });

      req.end();
    });
  }

  async runScenario(name, config) {
    console.log(`\n🚀 Running scenario: ${name}`);
    console.log(`📊 Config: ${config.concurrent} concurrent, ${config.requestsPerSecond} RPS, ${config.duration}s`);
    
    const results = {
      name,
      config,
      requests: [],
      startTime: Date.now()
    };

    const interval = 1000 / config.requestsPerSecond;
    const endTime = Date.now() + (config.duration * 1000);
    
    let requestCount = 0;
    
    while (Date.now() < endTime) {
      const batchStart = Date.now();
      const requestsThisBatch = Math.min(config.concurrent, config.requestsPerSecond);
      
      const promises = [];
      for (let i = 0; i < requestsThisBatch; i++) {
        promises.push(this.makeRequest(config.timeout));
      }
      
      const batchResults = await Promise.all(promises);
      results.requests.push(...batchResults);
      requestCount += requestsThisBatch;
      
      // Progress update
      if (requestCount % (config.requestsPerSecond * 10) === 0) {
        const elapsed = (Date.now() - results.startTime) / 1000;
        const currentRPS = requestCount / elapsed;
        const successCount = batchResults.filter(r => r.success).length;
        console.log(`  ⏱️  ${elapsed.toFixed(1)}s: ${requestCount} requests, ${currentRPS.toFixed(1)} RPS, ${successCount}/${requestsThisBatch} success`);
      }
      
      // Rate limiting
      const batchTime = Date.now() - batchStart;
      const sleepTime = Math.max(0, interval - batchTime);
      if (sleepTime > 0) {
        await new Promise(resolve => setTimeout(resolve, sleepTime));
      }
    }
    
    results.endTime = Date.now();
    results.totalRequests = requestCount;
    
    return this.analyzeResults(results);
  }

  analyzeResults(results) {
    const duration = (results.endTime - results.startTime) / 1000;
    const successfulRequests = results.requests.filter(r => r.success);
    const failedRequests = results.requests.filter(r => !r.success);
    
    const responseTimes = successfulRequests.map(r => r.responseTime);
    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
    
    const analysis = {
      name: results.name,
      config: results.config,
      duration,
      totalRequests: results.totalRequests,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      successRate: (successfulRequests.length / results.totalRequests) * 100,
      actualRPS: results.totalRequests / duration,
      targetRPS: results.config.requestsPerSecond,
      
      // Response time statistics
      avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      p50: sortedResponseTimes.length > 0 ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.5)] : 0,
      p90: sortedResponseTimes.length > 0 ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.9)] : 0,
      p95: sortedResponseTimes.length > 0 ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] : 0,
      p99: sortedResponseTimes.length > 0 ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] : 0,
      
      // Status codes
      statusCodes: {},
      errors: failedRequests.map(r => r.error).filter(Boolean)
    };
    
    // Count status codes
    results.requests.forEach(r => {
      if (r.statusCode) {
        analysis.statusCodes[r.statusCode] = (analysis.statusCodes[r.statusCode] || 0) + 1;
      }
    });
    
    return analysis;
  }

  printScenarioResults(analysis) {
    console.log(`\n📈 Results for: ${analysis.name}`);
    console.log('='.repeat(50));
    console.log(`⏱️  Duration: ${analysis.duration.toFixed(2)}s`);
    console.log(`📊 Total Requests: ${analysis.totalRequests.toLocaleString()}`);
    console.log(`✅ Success Rate: ${analysis.successRate.toFixed(2)}%`);
    console.log(`🚀 Actual RPS: ${analysis.actualRPS.toFixed(2)} (target: ${analysis.targetRPS})`);
    console.log(`📊 Avg Response Time: ${analysis.avgResponseTime.toFixed(2)}ms`);
    console.log(`📈 P95 Response Time: ${analysis.p95.toFixed(2)}ms`);
    
    if (Object.keys(analysis.statusCodes).length > 0) {
      console.log('📋 Status Codes:');
      Object.entries(analysis.statusCodes)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([code, count]) => {
          const percentage = (count / analysis.totalRequests * 100).toFixed(2);
          console.log(`  ${code}: ${count} (${percentage}%)`);
        });
    }
    
    if (analysis.errors.length > 0) {
      const errorTypes = {};
      analysis.errors.forEach(error => {
        errorTypes[error] = (errorTypes[error] || 0) + 1;
      });
      console.log('❌ Errors:');
      Object.entries(errorTypes).forEach(([error, count]) => {
        console.log(`  ${error}: ${count}`);
      });
    }
  }

  async runAllScenarios() {
    const scenarios = [
      {
        name: 'Light Load',
        config: { concurrent: 5, requestsPerSecond: 10, duration: 60, timeout: 5000 }
      },
      {
        name: 'Medium Load',
        config: { concurrent: 10, requestsPerSecond: 50, duration: 60, timeout: 10000 }
      },
      {
        name: 'Heavy Load',
        config: { concurrent: 20, requestsPerSecond: 100, duration: 60, timeout: 10000 }
      },
      {
        name: 'Stress Test',
        config: { concurrent: 50, requestsPerSecond: 200, duration: 60, timeout: 15000 }
      },
      {
        name: 'Burst Test',
        config: { concurrent: 100, requestsPerSecond: 500, duration: 30, timeout: 20000 }
      }
    ];

    console.log(`🎯 Starting comprehensive load test for: ${this.targetUrl}`);
    console.log(`📊 Running ${scenarios.length} scenarios...`);

    for (const scenario of scenarios) {
      const results = await this.runScenario(scenario.name, scenario.config);
      this.results.push(results);
      this.printScenarioResults(results);
      
      // Wait between scenarios
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    this.generateComprehensiveReport();
  }

  generateComprehensiveReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE LOAD TEST REPORT');
    console.log('='.repeat(80));
    console.log(`🎯 Target URL: ${this.targetUrl}`);
    console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
    console.log('');

    // Summary table
    console.log('📊 SUMMARY TABLE');
    console.log('-'.repeat(80));
    console.log('Scenario'.padEnd(15) + 'RPS'.padEnd(8) + 'Success%'.padEnd(10) + 'Avg(ms)'.padEnd(10) + 'P95(ms)'.padEnd(10) + 'Status');
    console.log('-'.repeat(80));
    
    this.results.forEach(result => {
      let status = '🟢';
      if (result.successRate < 95 || result.avgResponseTime > 2000 || result.p95 > 5000) {
        status = '🔴';
      } else if (result.successRate < 99 || result.avgResponseTime > 1000) {
        status = '🟡';
      }
      
      console.log(
        result.name.padEnd(15) +
        result.actualRPS.toFixed(1).padEnd(8) +
        result.successRate.toFixed(1).padEnd(10) +
        result.avgResponseTime.toFixed(0).padEnd(10) +
        result.p95.toFixed(0).padEnd(10) +
        status
      );
    });

    // Performance analysis
    console.log('\n🔍 PERFORMANCE ANALYSIS');
    console.log('-'.repeat(40));
    
    const maxRPS = Math.max(...this.results.map(r => r.actualRPS));
    const maxRPSScenario = this.results.find(r => r.actualRPS === maxRPS);
    
    console.log(`🚀 Maximum sustainable RPS: ${maxRPS.toFixed(1)} (${maxRPSScenario.name})`);
    
    const bestResponseTime = Math.min(...this.results.map(r => r.avgResponseTime));
    const bestResponseTimeScenario = this.results.find(r => r.avgResponseTime === bestResponseTime);
    
    console.log(`⚡ Best average response time: ${bestResponseTime.toFixed(2)}ms (${bestResponseTimeScenario.name})`);
    
    const worstResponseTime = Math.max(...this.results.map(r => r.avgResponseTime));
    const worstResponseTimeScenario = this.results.find(r => r.avgResponseTime === worstResponseTime);
    
    console.log(`🐌 Worst average response time: ${worstResponseTime.toFixed(2)}ms (${worstResponseTimeScenario.name})`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));
    
    const stressTest = this.results.find(r => r.name === 'Stress Test');
    const heavyLoad = this.results.find(r => r.name === 'Heavy Load');
    
    if (stressTest && stressTest.successRate < 95) {
      console.log('🔴 Server struggles under high load - consider scaling up');
    } else if (heavyLoad && heavyLoad.successRate > 99 && heavyLoad.avgResponseTime < 1000) {
      console.log('🟢 Server handles moderate load well');
    }
    
    if (this.results.some(r => r.avgResponseTime > 2000)) {
      console.log('🟡 Response times could be optimized - check database queries and caching');
    }
    
    if (this.results.some(r => r.p95 > 5000)) {
      console.log('🟡 High latency spikes detected - investigate slow queries or resource bottlenecks');
    }
    
    if (maxRPS < 50) {
      console.log('🔴 Low throughput - server may need optimization or more resources');
    } else if (maxRPS > 200) {
      console.log('🟢 Excellent throughput capacity');
    }

    // Save detailed results to file
    const reportData = {
      targetUrl: this.targetUrl,
      testDate: new Date().toISOString(),
      results: this.results
    };
    
    fs.writeFileSync('load-test-results.json', JSON.stringify(reportData, null, 2));
    console.log('\n💾 Detailed results saved to load-test-results.json');
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run comprehensive load test
async function runAdvancedLoadTest() {
  const tester = new AdvancedLoadTester('https://taxi.aktau-go.kz/');
  
  try {
    await tester.runAllScenarios();
  } catch (error) {
    console.error('❌ Advanced load test failed:', error.message);
  }
}

runAdvancedLoadTest(); 