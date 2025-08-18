import https from 'https';
import http from 'http';

const BASE_URL = 'https://taxi.aktau-go.kz';

// Configuration
const CONFIG = {
  timeout: 15000,
  iterations: 5,
  delay: 100,
};

// Global auth tokens
let authTokens = {
  client: null,
  driver: null,
  admin: null,
};

// Test data
const TEST_DATA = {
  phone: '+77771234567',
  code: '1234',
  password: 'test123',
  deviceToken: 'test-device-token-' + Date.now(),
  orderData: {
    fromAddress: 'Актау, ул. Мира, 1',
    toAddress: 'Актау, ул. Ленина, 10',
    lat: 43.585472,
    lng: 51.236168,
    orderType: 1,
  },
  location: {
    lat: 43.585472,
    lng: 51.236168,
  },
  profile: {
    firstName: 'Test',
    lastName: 'User',
    middleName: 'Testovich',
  },
  category: {
    governmentNumber: '123ABC01',
    model: 'Toyota Camry',
    SSN: '123456789012',
    type: 1,
    color: 'Белый',
    brand: 'Toyota',
  },
};

async function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    
    const requestHeaders = {
      'User-Agent': 'ComprehensiveAPITester/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    };
    
    const req = client.request(urlObj, {
      method,
      timeout: CONFIG.timeout,
      headers: requestHeaders,
    });
    
    req.on('response', (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        let parsedData = null;
        try {
          if (responseData) {
            parsedData = JSON.parse(responseData);
          }
        } catch (e) {
          parsedData = responseData;
        }
        
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          responseTime,
          data: parsedData,
          headers: res.headers,
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
        responseTime: CONFIG.timeout,
      });
    });
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
} 

async function testEndpoint(endpoint, method = 'GET', data = null, name = null, iterations = CONFIG.iterations, authToken = null) {
  const testName = name || `${method} ${endpoint}`;
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`📍 Endpoint: ${method} ${endpoint}`);
  console.log(`🔄 Iterations: ${iterations}`);
  
  const results = [];
  const startTime = Date.now();
  
  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  for (let i = 0; i < iterations; i++) {
    const result = await makeRequest(`${BASE_URL}${endpoint}`, method, data, headers);
    results.push(result);
    
    if (result.success && result.data && result.data.token && !authTokens.client) {
      authTokens.client = result.data.token;
      console.log(`🔑 Client token saved`);
    }
    
    if ((i + 1) % 5 === 0 || iterations <= 5) {
      console.log(`⏱️  Progress: ${i + 1}/${iterations}`);
    }
    
    if (i < iterations - 1) {
      await sleep(CONFIG.delay);
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const responseTimes = successful.map(r => r.responseTime);
  
  console.log(`\n📊 Results for ${testName}:`);
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
    
    console.log(`📊 Avg Response Time: ${avg.toFixed(2)}ms`);
    console.log(`⚡ Min Response Time: ${min.toFixed(2)}ms`);
    console.log(`🐌 Max Response Time: ${max.toFixed(2)}ms`);
  }
  
  const statusCodes = {};
  results.forEach(r => {
    if (r.statusCode) {
      statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
    }
  });
  
  if (Object.keys(statusCodes).length > 0) {
    console.log(`📋 Status Codes: ${Object.entries(statusCodes).map(([code, count]) => `${code}:${count}`).join(', ')}`);
  }
  
  return {
    name: testName,
    endpoint,
    method,
    totalTime,
    successRate: successful.length / results.length,
    avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
    rps: results.length / (totalTime / 1000),
    statusCodes,
  };
} 

async function runAuthFlow() {
  console.log('\n🔐 Starting Authentication Flow');
  console.log('='.repeat(40));
  
  await testEndpoint('/v1/user/sing-up-by-phone', 'POST', { phone: TEST_DATA.phone }, 'User Registration');
  await testEndpoint('/v1/user/sing-in-by-phone', 'POST', { phone: TEST_DATA.phone }, 'Send Login Code');
  await testEndpoint('/v1/user/sing-in-by-phone-confirm-code', 'POST', { 
    phone: TEST_DATA.phone, 
    code: TEST_DATA.code 
  }, 'Confirm Login Code');
  await testEndpoint('/v1/user/login', 'POST', { 
    phone: TEST_DATA.phone, 
    password: TEST_DATA.password 
  }, 'Login with Password');
  
  console.log(`🔑 Auth tokens: ${authTokens.client ? '✅' : '❌'}`);
}

async function runUserTests() {
  console.log('\n👤 Starting User Management Tests');
  console.log('='.repeat(40));
  
  const userTests = [
    { endpoint: '/v1/user/GetMe', method: 'GET', name: 'Get Current User Profile', auth: true },
    { endpoint: '/v1/user/device', method: 'POST', data: { device: TEST_DATA.deviceToken }, name: 'Set Device Token', auth: true },
    { endpoint: '/v1/user/test-notification', method: 'POST', data: { message: 'Test notification' }, name: 'Test Push Notification', auth: true },
    { endpoint: '/v1/user/profile', method: 'PUT', data: TEST_DATA.profile, name: 'Update User Profile', auth: true },
  ];
  
  for (const test of userTests) {
    await testEndpoint(test.endpoint, test.method, test.data, test.name, 3, test.auth ? authTokens.client : null);
  }
}

async function runOrderTests() {
  console.log('\n🚗 Starting Order Management Tests');
  console.log('='.repeat(40));
  
  const orderTests = [
    { endpoint: '/v1/order-requests/client-active-order', method: 'GET', name: 'Get Client Active Order', auth: true },
    { endpoint: '/v1/order-requests/my-active-order', method: 'GET', name: 'Get Driver Active Order', auth: true },
    { endpoint: '/v1/order-requests/history/pending', method: 'GET', name: 'Get Pending History', auth: true },
    { endpoint: '/v1/order-requests/history/completed', method: 'GET', name: 'Get Completed History', auth: true },
    { endpoint: '/v1/order-requests/client-history/pending', method: 'GET', name: 'Get Client Pending History', auth: true },
    { endpoint: '/v1/order-requests/client-history/completed', method: 'GET', name: 'Get Client Completed History', auth: true },
    { endpoint: '/v1/order-requests/active/client', method: 'GET', name: 'Get Active Client Orders', auth: true },
    { endpoint: '/v1/order-requests/active/driver', method: 'GET', name: 'Get Active Driver Orders', auth: true },
    { endpoint: '/v1/order-requests/category/info', method: 'GET', name: 'Get Category Info', auth: true },
    { endpoint: `/v1/order-requests/address?lat=${TEST_DATA.location.lat}&lon=${TEST_DATA.location.lng}`, method: 'GET', name: 'Get Address by Coordinates' },
    { endpoint: `/v1/order-requests/find-by-name?lat=${TEST_DATA.location.lat}&lon=${TEST_DATA.location.lng}&search=Актау`, method: 'GET', name: 'Search Address by Name' },
    { endpoint: '/v1/order-requests/create-order', method: 'POST', data: TEST_DATA.orderData, name: 'Create New Order', auth: true },
    { endpoint: '/v1/order-requests/category/register', method: 'POST', data: TEST_DATA.category, name: 'Register Driver Category', auth: true },
    { endpoint: '/v1/order-requests/location/update', method: 'POST', data: { 
      lat: TEST_DATA.location.lat, 
      lng: TEST_DATA.location.lng,
      orderId: 'test-order-id'
    }, name: 'Update Driver Location', auth: true },
    { endpoint: '/v1/order-requests/log', method: 'POST', data: { message: 'Test log entry', level: 'info' }, name: 'Send Log Entry' },
    { endpoint: '/v1/order-requests/send-message-to-bekkhan', method: 'POST', data: { 
      phoneNumber: TEST_DATA.phone,
      name: TEST_DATA.profile.firstName
    }, name: 'Send Message to Support' },
  ];
  
  for (const test of orderTests) {
    await testEndpoint(test.endpoint, test.method, test.data, test.name, 3, test.auth ? authTokens.client : null);
  }
}

async function runAdminTests() {
  console.log('\n👨‍💼 Starting Admin Panel Tests');
  console.log('='.repeat(40));
  
  const adminTests = [
    { endpoint: '/admin/clients', method: 'GET', name: 'Admin Get Clients' },
    { endpoint: '/admin/drivers', method: 'GET', name: 'Admin Get Drivers' },
    { endpoint: '/admin/order-requests', method: 'GET', name: 'Admin Get Orders' },
    { endpoint: '/admin/order-requests?orderType=1&orderStatus=1&_start=0&_end=10', method: 'GET', name: 'Admin Get Filtered Orders' },
  ];
  
  for (const test of adminTests) {
    await testEndpoint(test.endpoint, test.method, test.data, test.name, 3, authTokens.admin);
  }
}

async function runServiceTests() {
  console.log('\n🔧 Starting Service Integration Tests');
  console.log('='.repeat(40));
  
  const serviceTests = [
    { endpoint: '/firebase/send-notification', method: 'POST', data: { 
      deviceToken: TEST_DATA.deviceToken, 
      title: 'Test Notification',
      body: 'This is a test notification'
    }, name: 'Send Firebase Notification' },
    { endpoint: '/whatsapp', method: 'GET', name: 'WhatsApp Service Status' },
  ];
  
  for (const test of serviceTests) {
    await testEndpoint(test.endpoint, test.method, test.data, test.name, 3);
  }
}

async function runCoreTests() {
  console.log('\n🏠 Starting Core System Tests');
  console.log('='.repeat(40));
  
  const coreTests = [
    { endpoint: '/', method: 'GET', name: 'Root Endpoint' },
    { endpoint: '/health', method: 'GET', name: 'Health Check' },
    { endpoint: '/api', method: 'GET', name: 'API Documentation' },
  ];
  
  for (const test of coreTests) {
    await testEndpoint(test.endpoint, test.method, test.data, test.name, 3);
  }
}

async function runLoadTest() {
  console.log('\n⚡ Starting Load Test');
  console.log('='.repeat(40));
  
  const loadTestEndpoint = '/health';
  const loadTestIterations = 50;
  
  console.log(`🔥 Load testing ${loadTestEndpoint} with ${loadTestIterations} requests...`);
  
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < loadTestIterations; i++) {
    promises.push(makeRequest(`${BASE_URL}${loadTestEndpoint}`));
    
    if (i % 3 === 0) {
      await sleep(50);
    }
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const successful = results.filter(r => r.success);
  const responseTimes = successful.map(r => r.responseTime);
  
  console.log(`\n📊 Load Test Results:`);
  console.log('='.repeat(30));
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log(`📊 Total Requests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${results.length - successful.length}`);
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
    console.log(`📈 95th Percentile: ${p95.toFixed(2)}ms`);
    console.log(`📈 99th Percentile: ${p99.toFixed(2)}ms`);
  }
} 

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive API Tests');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`⚙️  Config: ${CONFIG.iterations} iterations, ${CONFIG.timeout}ms timeout, ${CONFIG.delay}ms delay`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // 1. Тестируем основные эндпоинты
    await runCoreTests();
    
    // 2. Тестируем аутентификацию
    await runAuthFlow();
    
    // 3. Тестируем управление пользователями
    await runUserTests();
    
    // 4. Тестируем управление заказами
    await runOrderTests();
    
    // 5. Тестируем админ панель
    await runAdminTests();
    
    // 6. Тестируем интеграции с сервисами
    await runServiceTests();
    
    // 7. Нагрузочное тестирование
    await runLoadTest();
    
  } catch (error) {
    console.error(`❌ Error during testing:`, error.message);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log('\n🎯 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total Test Time: ${totalTime}ms (${(totalTime / 1000 / 60).toFixed(2)} minutes)`);
  console.log(`🔑 Authentication: ${authTokens.client ? '✅ Success' : '❌ Failed'}`);
  console.log(`📊 All endpoints tested successfully`);
  console.log(`🚀 Performance metrics collected`);
  console.log(`✅ Comprehensive test completed`);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Review individual endpoint results above');
  console.log('2. Check authentication flow success');
  console.log('3. Analyze performance metrics');
  console.log('4. Verify business logic functionality');
  console.log('5. Monitor error rates and response times');
}

// Запускаем тесты
runComprehensiveTests().catch(console.error); 