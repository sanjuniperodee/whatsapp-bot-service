import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { DatabaseHelper } from '../../helpers/database.helper';
import { Knex } from 'knex';

describe('Database Migration Tests', () => {
  let module: TestingModule;
  let knex: Knex;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Initialize database connection
    const knexConfig = {
      client: 'pg',
      connection: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5433'),
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'taxi_service_test',
      },
    };
    
    knex = require('knex')(knexConfig);
    DatabaseHelper.initialize(knex);
  });

  afterAll(async () => {
    await knex.destroy();
    await module.close();
  });

  describe('Migration Execution', () => {
    it('should run all migrations successfully', async () => {
      const migrations = await knex.migrate.list();
      expect(migrations).toBeDefined();
      expect(migrations.length).toBeGreaterThan(0);
    });

    it('should have all required tables', async () => {
      const tables = await knex.raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tableNames = tables.rows.map(row => row.table_name);
      
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('order_requests');
      expect(tableNames).toContain('whatsapp_users');
      expect(tableNames).toContain('sessions');
      expect(tableNames).toContain('category_license');
    });

    it('should have proper table structures', async () => {
      // Check users table structure
      const usersColumns = await knex.raw(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      const userColumnNames = usersColumns.rows.map(row => row.column_name);
      expect(userColumnNames).toContain('id');
      expect(userColumnNames).toContain('phone');
      expect(userColumnNames).toContain('first_name');
      expect(userColumnNames).toContain('last_name');
      expect(userColumnNames).toContain('device_token');
      expect(userColumnNames).toContain('blocked_until');
      expect(userColumnNames).toContain('block_reason');
    });

    it('should have proper indexes', async () => {
      const indexes = await knex.raw(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);

      const indexNames = indexes.rows.map(row => row.indexname);
      
      // Check for important indexes
      expect(indexNames.some(name => name.includes('users_phone'))).toBe(true);
      expect(indexNames.some(name => name.includes('order_requests_client_id'))).toBe(true);
      expect(indexNames.some(name => name.includes('order_requests_driver_id'))).toBe(true);
    });
  });

  describe('Migration Rollback', () => {
    it('should rollback migrations successfully', async () => {
      // Get current migration status
      const currentMigrations = await knex.migrate.list();
      const currentVersion = currentMigrations[0].version;

      // Rollback one migration
      await knex.migrate.rollback();

      // Check that rollback was successful
      const newMigrations = await knex.migrate.list();
      const newVersion = newMigrations[0].version;

      expect(newVersion).not.toBe(currentVersion);
    });

    it('should reapply migrations after rollback', async () => {
      // Run migrations again
      await knex.migrate.latest();

      // Check that all tables exist
      const tables = await knex.raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tableNames = tables.rows.map(row => row.table_name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('order_requests');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity during migrations', async () => {
      // Create test data
      const user = await DatabaseHelper.createTestUser({
        phone: '+77771234567',
        firstName: 'Test',
        lastName: 'User',
      });

      const order = await DatabaseHelper.createTestOrder({
        clientId: user.id,
        fromAddress: 'Test From',
        toAddress: 'Test To',
        lat: 43.585472,
        lng: 51.236168,
        orderType: 1,
        price: 1000,
      });

      // Verify data exists
      const userData = await knex('users').where('id', user.id).first();
      const orderData = await knex('order_requests').where('id', order.id).first();

      expect(userData).toBeDefined();
      expect(orderData).toBeDefined();
      expect(userData.phone).toBe('+77771234567');
      expect(orderData.client_id).toBe(user.id);
    });

    it('should handle foreign key constraints', async () => {
      // Try to create order with non-existent client
      try {
        await knex('order_requests').insert({
          id: 'non-existent-order',
          client_id: 'non-existent-client',
          from_address: 'Test From',
          to_address: 'Test To',
          lat: 43.585472,
          lng: 51.236168,
          order_type: 1,
          price: 1000,
          status: 'CREATED',
          created_at: new Date(),
          updated_at: new Date(),
        });
        fail('Should have thrown foreign key constraint error');
      } catch (error) {
        expect(error.message).toContain('foreign key constraint');
      }
    });
  });

  describe('Performance', () => {
    it('should have efficient query performance', async () => {
      // Create test data
      const users = [];
      for (let i = 0; i < 100; i++) {
        const user = await DatabaseHelper.createTestUser({
          phone: `+7777123456${i.toString().padStart(2, '0')}`,
          firstName: `User${i}`,
          lastName: 'Test',
        });
        users.push(user);
      }

      // Create orders
      for (let i = 0; i < 200; i++) {
        const user = users[i % users.length];
        await DatabaseHelper.createTestOrder({
          clientId: user.id,
          fromAddress: `Test From ${i}`,
          toAddress: `Test To ${i}`,
          lat: 43.585472 + (i * 0.001),
          lng: 51.236168 + (i * 0.001),
          orderType: 1,
          price: 1000 + (i * 10),
        });
      }

      // Test query performance
      const startTime = Date.now();
      
      const results = await knex('order_requests')
        .join('users', 'order_requests.client_id', 'users.id')
        .select('order_requests.*', 'users.first_name', 'users.last_name')
        .where('order_requests.status', 'CREATED')
        .limit(50);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle large dataset queries', async () => {
      // Create large dataset
      const users = [];
      for (let i = 0; i < 1000; i++) {
        const user = await DatabaseHelper.createTestUser({
          phone: `+7777123456${i.toString().padStart(3, '0')}`,
          firstName: `User${i}`,
          lastName: 'Test',
        });
        users.push(user);
      }

      // Test pagination performance
      const startTime = Date.now();
      
      const results = await knex('users')
        .select('*')
        .limit(100)
        .offset(0);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(results.length).toBe(100);
    });
  });

  describe('Schema Validation', () => {
    it('should have correct column types', async () => {
      const usersColumns = await knex.raw(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      const phoneColumn = usersColumns.rows.find(row => row.column_name === 'phone');
      expect(phoneColumn.data_type).toBe('character varying');
      expect(phoneColumn.character_maximum_length).toBe(20);

      const firstNameColumn = usersColumns.rows.find(row => row.column_name === 'first_name');
      expect(firstNameColumn.data_type).toBe('character varying');
      expect(firstNameColumn.character_maximum_length).toBe(50);
    });

    it('should have proper constraints', async () => {
      const constraints = await knex.raw(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        ORDER BY table_name, constraint_name
      `);

      const constraintTypes = constraints.rows.map(row => row.constraint_type);
      expect(constraintTypes).toContain('PRIMARY KEY');
      expect(constraintTypes).toContain('FOREIGN KEY');
      expect(constraintTypes).toContain('UNIQUE');
    });

    it('should have proper default values', async () => {
      const orderColumns = await knex.raw(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_name = 'order_requests'
        ORDER BY ordinal_position
      `);

      const statusColumn = orderColumns.rows.find(row => row.column_name === 'status');
      expect(statusColumn.column_default).toBe("'CREATED'");

      const createdAtColumn = orderColumns.rows.find(row => row.column_name === 'created_at');
      expect(createdAtColumn.column_default).toBe('CURRENT_TIMESTAMP');
    });
  });
});
