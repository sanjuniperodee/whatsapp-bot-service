#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Comprehensive Test Suite');
console.log('=====================================');

const testSuites = [
  {
    name: 'Unit Tests - Domain Entities',
    command: 'npm test -- test/unit/domains/',
    description: 'Testing domain entities, value objects, and business logic'
  },
  {
    name: 'Unit Tests - Command Handlers',
    command: 'npm test -- test/unit/commands/',
    description: 'Testing command handlers and use cases'
  },
  {
    name: 'Integration Tests - Repositories',
    command: 'npm test -- test/integration/repositories/',
    description: 'Testing database repositories and data persistence'
  },
  {
    name: 'Integration Tests - Services',
    command: 'npm test -- test/integration/services/',
    description: 'Testing external service integrations'
  },
  {
    name: 'E2E Tests - Authentication',
    command: 'npm test -- test/e2e/auth/',
    description: 'Testing complete authentication flows'
  },
  {
    name: 'E2E Tests - Order Lifecycle',
    command: 'npm test -- test/e2e/order-lifecycle/',
    description: 'Testing complete order management flows'
  },
  {
    name: 'E2E Tests - Admin Panel',
    command: 'npm test -- test/e2e/admin/',
    description: 'Testing admin panel functionality'
  },
  {
    name: 'WebSocket Tests',
    command: 'npm test -- test/e2e/websocket/',
    description: 'Testing real-time communication'
  },
  {
    name: 'Business Logic Tests',
    command: 'npm test -- test/integration/business-logic/',
    description: 'Testing complex business rules and workflows'
  },
  {
    name: 'Edge Cases and Error Handling',
    command: 'npm test -- test/integration/edge-cases/',
    description: 'Testing error scenarios and edge cases'
  },
  {
    name: 'Load and Performance Tests',
    command: 'npm test -- test/load/',
    description: 'Testing system performance under load'
  },
  {
    name: 'Database Migration Tests',
    command: 'npm test -- test/database/',
    description: 'Testing database migrations and schema changes'
  }
];

async function runTestSuite(suite) {
  console.log(`\n📋 Running: ${suite.name}`);
  console.log(`📝 Description: ${suite.description}`);
  console.log('─'.repeat(60));
  
  try {
    const startTime = Date.now();
    execSync(suite.command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ ${suite.name} completed successfully in ${duration}s`);
    return { success: true, duration: parseFloat(duration) };
  } catch (error) {
    console.log(`❌ ${suite.name} failed`);
    console.log(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  const results = [];
  let totalDuration = 0;
  let successCount = 0;
  let failureCount = 0;

  console.log(`\n🎯 Running ${testSuites.length} test suites...\n`);

  for (const suite of testSuites) {
    const result = await runTestSuite(suite);
    results.push({ ...suite, ...result });
    
    if (result.success) {
      successCount++;
      totalDuration += result.duration;
    } else {
      failureCount++;
    }
  }

  // Generate comprehensive report
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Total Suites: ${testSuites.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📊 Success Rate: ${((successCount / testSuites.length) * 100).toFixed(1)}%`);
  console.log(`   ⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);
  
  console.log(`\n📋 Detailed Results:`);
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = result.success ? `${result.duration}s` : 'N/A';
    console.log(`   ${index + 1}. ${status} ${result.name} (${duration})`);
    if (!result.success) {
      console.log(`      Error: ${result.error}`);
    }
  });

  if (failureCount > 0) {
    console.log(`\n❌ ${failureCount} test suite(s) failed. Please review the errors above.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All test suites passed successfully!`);
    console.log(`📊 Coverage: ${successCount}/${testSuites.length} suites (100%)`);
    console.log(`⏱️  Total time: ${totalDuration.toFixed(2)}s`);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node test/run-tests.js [options]

Options:
  --help, -h          Show this help message
  --suite <name>      Run specific test suite
  --unit              Run only unit tests
  --integration       Run only integration tests
  --e2e               Run only E2E tests
  --coverage          Generate coverage report
  --verbose           Show detailed output

Examples:
  node test/run-tests.js                           # Run all tests
  node test/run-tests.js --suite "Unit Tests"      # Run specific suite
  node test/run-tests.js --unit                    # Run unit tests only
  node test/run-tests.js --coverage                # Run with coverage
`);
  process.exit(0);
}

if (args.includes('--suite')) {
  const suiteName = args[args.indexOf('--suite') + 1];
  const suite = testSuites.find(s => s.name.includes(suiteName));
  if (suite) {
    runTestSuite(suite);
  } else {
    console.log(`❌ Test suite "${suiteName}" not found.`);
    console.log('Available suites:', testSuites.map(s => s.name).join(', '));
    process.exit(1);
  }
} else if (args.includes('--unit')) {
  const unitSuites = testSuites.filter(s => s.name.includes('Unit Tests'));
  console.log('🧪 Running Unit Tests Only');
  unitSuites.forEach(suite => runTestSuite(suite));
} else if (args.includes('--integration')) {
  const integrationSuites = testSuites.filter(s => s.name.includes('Integration Tests'));
  console.log('🔗 Running Integration Tests Only');
  integrationSuites.forEach(suite => runTestSuite(suite));
} else if (args.includes('--e2e')) {
  const e2eSuites = testSuites.filter(s => s.name.includes('E2E Tests'));
  console.log('🌐 Running E2E Tests Only');
  e2eSuites.forEach(suite => runTestSuite(suite));
} else {
  runAllTests();
}
