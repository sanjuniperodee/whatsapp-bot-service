# Comprehensive Test Suite

This directory contains a complete automated test suite for the WhatsApp Bot Service backend, covering every aspect of the system from unit tests to end-to-end integration tests.

## 🎯 Test Coverage

### ✅ What's Tested

- **Domain Entities**: OrderRequest, User, Value Objects (Price, Address, Phone)
- **Command Handlers**: Create, Accept, Start, Complete, Cancel orders
- **Repository Layer**: Database operations, queries, transactions
- **API Endpoints**: All REST endpoints with authentication
- **WebSocket Communication**: Real-time updates, location tracking
- **External Services**: WhatsApp, Firebase, 2GIS, Redis integrations
- **Business Logic**: User blocking, order state machine, category system
- **Admin Panel**: User management, order management, statistics
- **Authentication**: Phone registration, SMS codes, JWT tokens
- **Error Handling**: Edge cases, validation, error recovery
- **Performance**: Load testing, concurrent operations
- **Database**: Migrations, query optimization

## 📁 Test Structure

```
test/
├── jest.config.js              # Jest configuration
├── setup.ts                    # Global test setup
├── global-setup.ts             # Database setup
├── global-teardown.ts          # Database cleanup
├── .env.test                   # Test environment variables
├── run-tests.js                # Comprehensive test runner
├── helpers/                     # Test utilities
│   ├── factories/              # Test data factories
│   │   ├── user.factory.ts
│   │   ├── order.factory.ts
│   │   └── category.factory.ts
│   ├── mocks/                  # Service mocks
│   │   ├── whatsapp.service.mock.ts
│   │   ├── firebase.service.mock.ts
│   │   ├── geocoding.service.mock.ts
│   │   └── redis.service.mock.ts
│   ├── auth.helper.ts          # Authentication utilities
│   ├── database.helper.ts      # Database utilities
│   └── websocket.helper.ts     # WebSocket utilities
├── unit/                       # Unit tests
│   ├── domains/                # Domain entity tests
│   │   ├── order-request/
│   │   └── user/
│   ├── commands/               # Command handler tests
│   │   ├── order-request/
│   │   └── user/
│   ├── value-objects/          # Value object tests
│   └── guards/                 # Guard tests
├── integration/                # Integration tests
│   ├── repositories/           # Repository tests
│   ├── services/               # Service integration tests
│   ├── business-logic/         # Business rule tests
│   └── edge-cases/             # Edge case tests
├── e2e/                        # End-to-end tests
│   ├── auth/                   # Authentication flow tests
│   ├── order-lifecycle/        # Order management tests
│   ├── admin/                  # Admin panel tests
│   └── websocket/              # WebSocket tests
├── load/                       # Load and performance tests
└── database/                   # Database migration tests
```

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests
npm run test:all

# Run with coverage
npm run test:comprehensive

# Run specific test types
npm run test:unit-only
npm run test:integration-only
npm run test:e2e-only
```

### Individual Test Suites

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e-full

# Specific test file
npm test -- test/unit/domains/order-request/order-request.entity.spec.ts
```

### Test Runner Options

```bash
# Run specific test suite
node test/run-tests.js --suite "Unit Tests"

# Run with coverage report
node test/run-tests.js --coverage

# Run with verbose output
node test/run-tests.js --verbose
```

## 🛠️ Test Configuration

### Environment Setup

The test suite uses a separate test database and Redis instance:

```env
# Test Database
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=taxi_service_test

# Test Redis
REDIS_HOST=localhost
REDIS_PORT=6380
```

### Jest Configuration

- **Test Environment**: Node.js
- **Coverage Threshold**: 80% (configurable)
- **Timeout**: 30 seconds for integration tests
- **Parallel Execution**: Disabled for database tests
- **Module Mapping**: Configured for TypeScript paths

## 📊 Test Categories

### 1. Unit Tests (150+ tests)

**Domain Entities**
- OrderRequest entity state transitions
- User entity blocking logic
- Value object validation
- Domain event emission

**Command Handlers**
- Create order with validation
- Accept order with status checks
- Complete order with rating
- Cancel order with reasons

### 2. Integration Tests (80+ tests)

**Repository Layer**
- Database CRUD operations
- Complex queries and filters
- Transaction handling
- Performance optimization

**Service Integrations**
- WhatsApp message sending
- Firebase push notifications
- 2GIS geocoding API
- Redis caching

### 3. E2E Tests (60+ tests)

**Authentication Flow**
- Phone registration
- SMS code sending
- JWT token generation
- Token refresh

**Order Lifecycle**
- Complete order flow
- Status transitions
- Error handling
- Location services

**Admin Panel**
- User management
- Order management
- Statistics and analytics
- Blocking/unblocking

### 4. WebSocket Tests (20+ tests)

**Real-time Communication**
- Connection management
- Event broadcasting
- Location tracking
- Connection cleanup

### 5. Load Tests (10+ tests)

**Performance Testing**
- Concurrent order creation
- WebSocket connections
- Database query performance
- Memory usage

## 🔧 Test Utilities

### Factories

```typescript
// Create test users
const user = UserFactory.create({
  phone: '+77771234567',
  firstName: 'Test',
  lastName: 'User'
});

// Create test orders
const order = OrderFactory.create({
  orderType: OrderType.TAXI,
  orderStatus: OrderStatus.CREATED
});
```

### Mocks

```typescript
// Mock WhatsApp service
const mockWhatsApp = new MockWhatsAppService();
mockWhatsApp.simulateError(new Error('API Error'));

// Mock Firebase service
const mockFirebase = new MockFirebaseService();
mockFirebase.simulateInvalidToken();
```

### Helpers

```typescript
// Database operations
await DatabaseHelper.cleanDatabase();
await DatabaseHelper.createTestUser(userData);

// Authentication
const token = AuthHelper.generateAccessToken(userId);
const headers = AuthHelper.getAuthHeaders(token);
```

## 📈 Coverage Reports

The test suite generates comprehensive coverage reports:

- **Line Coverage**: >85% target
- **Branch Coverage**: >80% target
- **Function Coverage**: >80% target
- **Statement Coverage**: >80% target

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

## 🐛 Debugging Tests

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Run specific test in debug mode
npm test -- --testNamePattern="should create order" --verbose
```

### Common Issues

1. **Database Connection**: Ensure test database is running
2. **Redis Connection**: Ensure test Redis instance is running
3. **Port Conflicts**: Check for port conflicts (3001, 5433, 6380)
4. **Environment Variables**: Verify test environment configuration

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:ci
```

### Docker Testing

```bash
# Run tests in Docker
docker-compose -f docker-compose.test.yml up --build

# Run specific test suite
docker-compose -f docker-compose.test.yml run test npm run test:unit
```

## 📝 Writing New Tests

### Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup test data
  });

  describe('Specific Functionality', () => {
    it('should handle valid case', async () => {
      // Arrange
      const input = { /* test data */ };
      
      // Act
      const result = await service.method(input);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });

    it('should handle error case', async () => {
      // Test error scenarios
      await expect(service.method(invalidInput)).rejects.toThrow();
    });
  });
});
```

### Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Naming**: Use descriptive test names
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Include boundary conditions
6. **Performance**: Consider test execution time

## 🎯 Success Criteria

- ✅ All domain entities tested with edge cases
- ✅ All command handlers tested with error scenarios
- ✅ All API endpoints tested (happy path + errors)
- ✅ All WebSocket events tested
- ✅ All integrations mocked and tested
- ✅ User blocking system fully tested
- ✅ Order lifecycle state machine validated
- ✅ Concurrency and race conditions covered
- ✅ >85% code coverage
- ✅ All tests pass in CI/CD pipeline

## 📞 Support

For questions about the test suite:

1. Check the test documentation
2. Review existing test examples
3. Run tests with verbose output
4. Check test logs for errors
5. Verify environment configuration

## 🔄 Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep test dependencies current
2. **Review Coverage**: Ensure coverage thresholds are met
3. **Performance**: Monitor test execution time
4. **Documentation**: Keep test documentation updated
5. **Refactoring**: Improve test structure and readability

### Adding New Features

When adding new features:

1. Write unit tests for domain logic
2. Write integration tests for repositories
3. Write E2E tests for API endpoints
4. Update test factories and helpers
5. Ensure coverage thresholds are maintained
