import { execSync } from 'child_process';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Drop test database
    console.log('🗑️ Dropping test database...');
    execSync('dropdb taxi_service_test 2>/dev/null || true', { stdio: 'inherit' });
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error);
  }
}
