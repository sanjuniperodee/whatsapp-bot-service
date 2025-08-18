import https from 'https';
import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    
    const req = client.request(urlObj, {
      method,
      timeout: 5000,
      headers: {
        'User-Agent': 'QuickLocalTester/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
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
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime: 5000,
      });
    });
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testEndpoint(endpoint, method = 'GET', data = null, name = null) {
  const testName = name || `${method} ${endpoint}`;
  console.log(`🧪 Testing: ${testName}`);
  
  const result = await makeRequest(`${BASE_URL}${endpoint}`, method, data);
  
  const status = result.success ? '✅' : '❌';
  console.log(`${status} ${testName} - ${result.statusCode} (${result.responseTime}ms)`);
  
  if (!result.success) {
    console.log(`   Error: ${result.error || 'Unknown error'}`);
  }
  
  return result;
}

async function runQuickLocalTest() {
  console.log('🚀 Quick Local API Test');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log('='.repeat(40));
  
  try {
    // Core endpoints
    await testEndpoint('/', 'GET', null, 'Root Endpoint');
    await testEndpoint('/health', 'GET', null, 'Health Check');
    await testEndpoint('/api', 'GET', null, 'API Documentation');
    
    // Auth endpoints
    await testEndpoint('/v1/user/sing-up-by-phone', 'POST', { phone: '+77771234567' }, 'User Registration');
    await testEndpoint('/v1/user/sing-in-by-phone', 'POST', { phone: '+77771234567' }, 'Send Login Code');
    
    // User endpoints
    await testEndpoint('/v1/user/GetMe', 'GET', null, 'Get Current User (no auth)');
    
    // Order endpoints
    await testEndpoint('/v1/order-requests/address?lat=43.585472&lon=51.236168', 'GET', null, 'Get Address');
    await testEndpoint('/v1/order-requests/find-by-name?lat=43.585472&lon=51.236168&search=Актау', 'GET', null, 'Search Address');
    
    // Admin endpoints
    await testEndpoint('/admin/clients', 'GET', null, 'Admin Get Clients');
    await testEndpoint('/admin/drivers', 'GET', null, 'Admin Get Drivers');
    
    // Service endpoints
    await testEndpoint('/firebase/send-notification', 'POST', { 
      deviceToken: 'test-token', 
      title: 'Test', 
      body: 'Test notification' 
    }, 'Firebase Notification');
    await testEndpoint('/whatsapp', 'GET', null, 'WhatsApp Status');
    
  } catch (error) {
    console.error(`❌ Test error:`, error.message);
  }
  
  console.log('\n✅ Quick test completed!');
  console.log('💡 Start your local server with: npm run start:dev');
}

runQuickLocalTest().catch(console.error); 