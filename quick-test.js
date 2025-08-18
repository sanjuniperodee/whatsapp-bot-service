import https from 'https';
import http from 'http';

async function quickTest() {
  const url = 'https://taxi.aktau-go.kz/';
  const testCount = 50;
  const concurrent = 10;
  
  console.log(`🚀 Quick load test for: ${url}`);
  console.log(`📊 Testing ${testCount} requests with ${concurrent} concurrent connections\n`);
  
  const results = [];
  const startTime = Date.now();
  
  // Make concurrent requests
  for (let i = 0; i < testCount; i += concurrent) {
    const batch = [];
    const batchSize = Math.min(concurrent, testCount - i);
    
    for (let j = 0; j < batchSize; j++) {
      batch.push(makeRequest(url));
    }
    
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    // Progress
    console.log(`⏱️  Progress: ${results.length}/${testCount} requests completed`);
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const responseTimes = successful.map(r => r.responseTime);
  
  console.log('\n📈 QUICK TEST RESULTS');
  console.log('='.repeat(40));
  console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
  console.log(`📊 Total Requests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📈 Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%`);
  console.log(`🚀 RPS: ${(results.length / duration).toFixed(2)}`);
  
  if (responseTimes.length > 0) {
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);
    
    console.log(`📊 Avg Response Time: ${avg.toFixed(2)}ms`);
    console.log(`⚡ Min Response Time: ${min.toFixed(2)}ms`);
    console.log(`🐌 Max Response Time: ${max.toFixed(2)}ms`);
  }
  
  // Status codes
  const statusCodes = {};
  results.forEach(r => {
    if (r.statusCode) {
      statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
    }
  });
  
  if (Object.keys(statusCodes).length > 0) {
    console.log('\n📋 Status Codes:');
    Object.entries(statusCodes).forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });
  }
  
  // Quick assessment
  console.log('\n🎯 QUICK ASSESSMENT');
  console.log('-'.repeat(30));
  
  const successRate = successful.length / results.length * 100;
  const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
  
  if (successRate >= 99 && avgResponseTime < 1000) {
    console.log('🟢 EXCELLENT - Server performing well');
  } else if (successRate >= 95 && avgResponseTime < 2000) {
    console.log('🟡 GOOD - Minor optimizations possible');
  } else {
    console.log('🔴 NEEDS ATTENTION - Performance issues detected');
  }
}

function makeRequest(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    
    const req = client.request(urlObj, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'QuickTester/1.0',
        'Accept': 'application/json'
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
          dataLength: data.length
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      resolve({
        error: error.message,
        responseTime,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - startTime;
      resolve({
        error: 'Request timeout',
        responseTime,
        success: false
      });
    });

    req.end();
  });
}

quickTest().catch(console.error); 