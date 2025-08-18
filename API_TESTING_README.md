# Comprehensive API Testing Guide

## Overview

This comprehensive API test suite is designed to test all endpoints of the WhatsApp Bot Service and measure performance metrics. The test covers authentication, user management, order management, admin panel, and service integrations.

## Features

### 🔍 Complete Endpoint Coverage
- **Core System**: Root endpoint, health check, API documentation
- **Authentication**: Registration, login, SMS verification
- **User Management**: Profile operations, device tokens, notifications
- **Order Management**: Order creation, tracking, history, geolocation
- **Admin Panel**: Client/driver management, order monitoring
- **Service Integrations**: Firebase notifications, WhatsApp status

### 📊 Performance Metrics
- Response time analysis (min, max, average)
- Success rate calculation
- Requests per second (RPS)
- 95th and 99th percentile response times
- Status code distribution

### 🚀 Load Testing
- Concurrent request testing
- Stress testing with 50+ requests
- Performance degradation analysis

## Configuration

### Test Settings
```javascript
const CONFIG = {
  timeout: 15000,        // Request timeout in ms
  iterations: 5,         // Number of requests per endpoint
  delay: 100,           // Delay between requests in ms
};
```

### Test Data
The test uses realistic test data including:
- Phone numbers for authentication
- GPS coordinates for geolocation testing
- Order details for taxi service simulation
- Device tokens for push notifications

## Usage

### Running the Test

1. **Basic Test Run**:
   ```bash
   node comprehensive-api-test.js
   ```

2. **With Custom Base URL**:
   Edit the `BASE_URL` constant in the test file:
   ```javascript
   const BASE_URL = 'https://your-api-domain.com';
   ```

3. **Environment-Specific Testing**:
   - Development: `http://localhost:3000`
   - Staging: `https://staging.taxi.aktau-go.kz`
   - Production: `https://taxi.aktau-go.kz`

### Test Execution Flow

1. **Core System Tests** (3 iterations each)
   - Root endpoint (`/`)
   - Health check (`/health`)
   - API documentation (`/api`)

2. **Authentication Flow** (5 iterations each)
   - User registration (`/v1/user/sing-up-by-phone`)
   - Send login code (`/v1/user/sing-in-by-phone`)
   - Confirm login code (`/v1/user/sing-in-by-phone-confirm-code`)
   - Login with password (`/v1/user/login`)

3. **User Management Tests** (3 iterations each)
   - Get current user profile (`/v1/user/GetMe`)
   - Set device token (`/v1/user/device`)
   - Test push notification (`/v1/user/test-notification`)
   - Update user profile (`/v1/user/profile`)

4. **Order Management Tests** (3 iterations each)
   - Client active order (`/v1/order-requests/client-active-order`)
   - Driver active order (`/v1/order-requests/my-active-order`)
   - Order history (pending/completed)
   - Address geocoding (`/v1/order-requests/address`)
   - Address search (`/v1/order-requests/find-by-name`)
   - Order creation (`/v1/order-requests/create-order`)
   - Category registration (`/v1/order-requests/category/register`)
   - Location updates (`/v1/order-requests/location/update`)
   - Logging (`/v1/order-requests/log`)
   - Support messaging (`/v1/order-requests/send-message-to-bekkhan`)

5. **Admin Panel Tests** (3 iterations each)
   - Get clients (`/admin/clients`)
   - Get drivers (`/admin/drivers`)
   - Get orders (`/admin/order-requests`)
   - Filtered orders with pagination

6. **Service Integration Tests** (3 iterations each)
   - Firebase notifications (`/firebase/send-notification`)
   - WhatsApp service status (`/whatsapp`)

7. **Load Testing** (50 concurrent requests)
   - Health endpoint stress test
   - Performance metrics collection

## Output Analysis

### Success Metrics
- **Success Rate**: Percentage of successful requests (200-299 status codes)
- **Response Time**: Average, minimum, maximum response times
- **RPS**: Requests per second throughput
- **Error Distribution**: Status code breakdown

### Performance Benchmarks
- **Excellent**: < 200ms average response time, > 95% success rate
- **Good**: 200-500ms average response time, 90-95% success rate
- **Acceptable**: 500-1000ms average response time, 80-90% success rate
- **Poor**: > 1000ms average response time, < 80% success rate

### Common Issues

#### 502 Bad Gateway
- Server is down or unreachable
- Network connectivity issues
- Load balancer problems

#### 401 Unauthorized
- Invalid or expired authentication tokens
- Missing authentication headers

#### 404 Not Found
- Endpoint doesn't exist
- Incorrect URL path

#### 500 Internal Server Error
- Server-side application errors
- Database connection issues

## Customization

### Adding New Endpoints
1. Add endpoint configuration to the appropriate test function
2. Include method, data, and authentication requirements
3. Update the test execution flow

### Modifying Test Data
Edit the `TEST_DATA` object to use different test values:
```javascript
const TEST_DATA = {
  phone: '+77771234567',
  code: '1234',
  // ... other test data
};
```

### Adjusting Performance Thresholds
Modify the `CONFIG` object to change test behavior:
```javascript
const CONFIG = {
  timeout: 20000,        // Increase timeout for slower environments
  iterations: 10,        // More iterations for better statistics
  delay: 200,           // Longer delays to reduce server load
};
```

## Best Practices

### Testing Strategy
1. **Start with Core Tests**: Verify basic connectivity first
2. **Test Authentication**: Ensure auth flow works before testing protected endpoints
3. **Progressive Testing**: Test simple endpoints before complex ones
4. **Load Testing Last**: Perform stress testing after functional tests pass

### Environment Considerations
- **Development**: Use localhost with shorter timeouts
- **Staging**: Test with realistic data and moderate load
- **Production**: Use conservative settings to avoid impacting users

### Monitoring
- Monitor server resources during testing
- Check application logs for errors
- Verify database performance impact
- Monitor external service dependencies

## Troubleshooting

### Common Problems

1. **All Tests Failing with 502**
   - Check if the server is running
   - Verify the BASE_URL is correct
   - Check network connectivity

2. **Authentication Tests Failing**
   - Verify SMS service is configured
   - Check database connectivity
   - Ensure test phone numbers are valid

3. **Slow Response Times**
   - Check server CPU and memory usage
   - Verify database query performance
   - Check external API dependencies

4. **Intermittent Failures**
   - Increase timeout values
   - Add retry logic for flaky endpoints
   - Check for race conditions

### Debug Mode
Enable detailed logging by modifying the test configuration:
```javascript
const DEBUG = true; // Add this to see detailed request/response data
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: node comprehensive-api-test.js
```

### Exit Codes
- `0`: All tests passed successfully
- `1`: One or more tests failed
- `2`: Configuration error
- `3`: Network connectivity issues

## Maintenance

### Regular Updates
- Update test data to match current business logic
- Add new endpoints as they are developed
- Adjust performance thresholds based on production metrics
- Update authentication flow if security changes

### Version Control
- Keep test files in version control
- Tag releases with API versions
- Document breaking changes in test configuration

## Support

For issues with the test suite:
1. Check the troubleshooting section
2. Review server logs for detailed error information
3. Verify configuration settings
4. Test with a simple curl command to isolate issues

---

**Note**: This test suite is designed for comprehensive API testing and should be used responsibly to avoid overwhelming production systems. 