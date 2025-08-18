import https from 'https';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function makeRequest(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    
    const req = client.request(urlObj, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'PerformanceTester/1.0',
        'Accept': 'application/json',
      },
    });
    
    req.on('response', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          responseTime,
          data: data ? JSON.parse(data) : null,
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      resolve({
        success: false,
        error: error.message,
        responseTime: endTime - startTime,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime: 10000,
      });
    });
    
    req.end();
  });
}

async function testEndpoint(endpoint, name, iterations = 10) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📍 Endpoint: ${endpoint}`);
  console.log(`🔄 Iterations: ${iterations}`);
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const result = await makeRequest(`${BASE_URL}${endpoint}`);
    results.push(result);
    
    if ((i + 1) % 5 === 0) {
      console.log(`⏱️  Progress: ${i + 1}/${iterations}`);
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Анализ результатов
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const responseTimes = successful.map(r => r.responseTime);
  
  console.log(`\n📊 Results for ${name}:`);
  console.log('='.repeat(50));
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log(`📊 Total Requests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📈 Success Rate: ${(successful.length / results.length * 100).toFixed(2)}%`);
  console.log(`🚀 RPS: ${(results.length / (totalTime / 1000)).toFixed(2)}`);
  
  if (responseTimes.length > 0) {
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);
    const sorted = responseTimes.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    console.log(`📊 Avg Response Time: ${avg.toFixed(2)}ms`);
    console.log(`⚡ Min Response Time: ${min.toFixed(2)}ms`);
    console.log(`🐌 Max Response Time: ${max.toFixed(2)}ms`);
    console.log(`📈 P95 Response Time: ${p95.toFixed(2)}ms`);
    console.log(`📈 P99 Response Time: ${p99.toFixed(2)}ms`);
  }
  
  // Показываем пример ответа
  if (successful.length > 0 && successful[0].data) {
    console.log(`\n📋 Sample Response:`);
    console.log(JSON.stringify(successful[0].data, null, 2).substring(0, 500) + '...');
  }
  
  return {
    name,
    endpoint,
    totalTime,
    successRate: successful.length / results.length,
    avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
    rps: results.length / (totalTime / 1000),
  };
}

async function runPerformanceTests() {
  console.log('🚀 Starting Performance Tests');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  const tests = [
    { endpoint: '/performance/simple', name: 'Simple API Test', iterations: 50 },
    { endpoint: '/performance/db-simple', name: 'Simple DB Query', iterations: 30 },
    { endpoint: '/performance/db-complex', name: 'Complex DB Query', iterations: 20 },
    { endpoint: '/performance/cache-test', name: 'Cache Test', iterations: 40 },
    { endpoint: '/performance/heavy-computation?iterations=1000', name: 'Heavy Computation', iterations: 15 },
    { endpoint: '/performance/memory-test', name: 'Memory Test', iterations: 25 },
    { endpoint: '/performance/users?limit=10', name: 'Get Users (10)', iterations: 30 },
    { endpoint: '/performance/users?limit=50', name: 'Get Users (50)', iterations: 20 },
    { endpoint: '/performance/orders?limit=10', name: 'Get Orders (10)', iterations: 25 },
    { endpoint: '/performance/stats', name: 'Get Stats', iterations: 35 },
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await testEndpoint(test.endpoint, test.name, test.iterations);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error testing ${test.name}:`, error.message);
    }
  }
  
  // Сводный отчет
  console.log('\n📈 PERFORMANCE SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const status = result.successRate >= 0.95 ? '🟢' : result.successRate >= 0.9 ? '🟡' : '🔴';
    console.log(`${status} ${result.name.padEnd(25)} | RPS: ${result.rps.toFixed(2).padStart(6)} | Avg: ${result.avgResponseTime.toFixed(0).padStart(4)}ms | Success: ${(result.successRate * 100).toFixed(1).padStart(5)}%`);
  });
  
  // Общая статистика
  const totalRequests = results.reduce((sum, r) => sum + (r.rps * 10), 0); // Примерно 10 секунд на тест
  const avgResponseTime = results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length;
  const avgSuccessRate = results.reduce((sum, r) => sum + r.successRate, 0) / results.length;
  
  console.log('\n🎯 OVERALL PERFORMANCE');
  console.log('='.repeat(60));
  console.log(`📊 Total Estimated RPS: ${totalRequests.toFixed(2)}`);
  console.log(`📊 Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`📊 Average Success Rate: ${(avgSuccessRate * 100).toFixed(2)}%`);
  
  // Оценка производительности
  console.log('\n🎯 PERFORMANCE ASSESSMENT');
  console.log('='.repeat(60));
  
  if (avgResponseTime < 200 && avgSuccessRate > 0.95) {
    console.log('🟢 EXCELLENT - Server performing very well');
  } else if (avgResponseTime < 500 && avgSuccessRate > 0.9) {
    console.log('🟡 GOOD - Minor optimizations possible');
  } else if (avgResponseTime < 1000 && avgSuccessRate > 0.8) {
    console.log('🟠 ACCEPTABLE - Some optimizations needed');
  } else {
    console.log('🔴 NEEDS ATTENTION - Significant performance issues detected');
  }
}

// Запускаем тесты
runPerformanceTests().catch(console.error); 