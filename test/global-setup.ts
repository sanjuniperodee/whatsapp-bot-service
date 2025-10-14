import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.join(__dirname, '.env.test') });

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');
  
  try {
    // Create test database if it doesn't exist
    console.log('📊 Setting up test database...');
    execSync('createdb taxi_service_test 2>/dev/null || true', { stdio: 'inherit' });
    
    // Run migrations on test database
    console.log('🔄 Running test database migrations...');
    process.env.DATABASE_NAME = 'taxi_service_test';
    execSync('yarn migration:latest', { stdio: 'inherit' });
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    process.exit(1);
  }
}
