import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from '@domain/user/domain-repositories/user/user.repository';
import { DatabaseHelper } from '../../../helpers/database.helper';
import { UserFactory } from '../../../helpers/factories/user.factory';
import { Knex } from 'knex';

describe('UserRepository Integration Tests', () => {
  let repository: UserRepository;
  let knex: Knex;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [UserRepository],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    
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

  beforeEach(async () => {
    await DatabaseHelper.cleanDatabase();
  });

  describe('save', () => {
    it('should save user successfully', async () => {
      const user = UserFactory.create();
      
      await repository.save(user);
      
      const savedUser = await repository.findOneById(user.id.value);
      expect(savedUser).toBeDefined();
      expect(savedUser?.id.value).toBe(user.id.value);
      expect(savedUser?.phone.value).toBe(user.phone.value);
    });

    it('should update existing user', async () => {
      const user = UserFactory.create();
      await repository.save(user);
      
      user.editPersonalName('Updated', 'Name');
      await repository.save(user);
      
      const updatedUser = await repository.findOneById(user.id.value);
      expect(updatedUser?.getPropsCopy().firstName).toBe('Updated');
      expect(updatedUser?.getPropsCopy().lastName).toBe('Name');
    });

    it('should save user with blocking information', async () => {
      const blockedUser = UserFactory.createBlockedUser();
      
      await repository.save(blockedUser);
      
      const savedUser = await repository.findOneById(blockedUser.id.value);
      expect(savedUser?.getPropsCopy().isBlocked).toBe(true);
      expect(savedUser?.getPropsCopy().blockedUntil).toBeDefined();
      expect(savedUser?.getPropsCopy().blockReason).toBeDefined();
    });

    it('should save user with device token', async () => {
      const user = UserFactory.create({
        deviceToken: 'test-device-token-123',
      });
      
      await repository.save(user);
      
      const savedUser = await repository.findOneById(user.id.value);
      expect(savedUser?.getPropsCopy().deviceToken).toBe('test-device-token-123');
    });
  });

  describe('findOneById', () => {
    it('should find user by ID', async () => {
      const user = UserFactory.create();
      await repository.save(user);
      
      const foundUser = await repository.findOneById(user.id.value);
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.id.value).toBe(user.id.value);
    });

    it('should return null for non-existent user', async () => {
      const nonExistentId = global.testUtils.generateTestUUID();
      
      const foundUser = await repository.findOneById(nonExistentId);
      
      expect(foundUser).toBeNull();
    });

    it('should find user with all properties', async () => {
      const user = UserFactory.create({
        firstName: 'John',
        lastName: 'Doe',
        middleName: 'Smith',
        birthDate: '1990-01-01',
        deviceToken: 'device-token-123',
        isBlocked: true,
        blockedUntil: new Date('2024-12-31'),
        blockReason: 'Test violation',
      });
      
      await repository.save(user);
      
      const foundUser = await repository.findOneById(user.id.value);
      expect(foundUser?.getPropsCopy().firstName).toBe('John');
      expect(foundUser?.getPropsCopy().lastName).toBe('Doe');
      expect(foundUser?.getPropsCopy().middleName).toBe('Smith');
      expect(foundUser?.getPropsCopy().birthDate).toBe('1990-01-01');
      expect(foundUser?.getPropsCopy().deviceToken).toBe('device-token-123');
      expect(foundUser?.getPropsCopy().isBlocked).toBe(true);
    });
  });

  describe('findOneByPhone', () => {
    it('should find user by phone number', async () => {
      const phone = '+77771234567';
      const user = UserFactory.create({ phone });
      await repository.save(user);
      
      const foundUser = await repository.findOneByPhone(phone);
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.phone.value).toBe(phone);
    });

    it('should find user by normalized phone number', async () => {
      const phone = '+7 777 123 45 67';
      const user = UserFactory.create({ phone });
      await repository.save(user);
      
      const foundUser = await repository.findOneByPhone('+77771234567');
      
      expect(foundUser).toBeDefined();
      expect(foundUser?.phone.value).toBe(phone);
    });

    it('should return null for non-existent phone', async () => {
      const foundUser = await repository.findOneByPhone('+77779999999');
      
      expect(foundUser).toBeNull();
    });

    it('should handle different phone formats', async () => {
      const phoneFormats = [
        '+77771234567',
        '+7 777 123 45 67',
        '+7-777-123-45-67',
        '+7 (777) 123-45-67',
      ];

      for (const phone of phoneFormats) {
        const user = UserFactory.create({ phone });
        await repository.save(user);
        
        const foundUser = await repository.findOneByPhone(phone);
        expect(foundUser).toBeDefined();
        expect(foundUser?.phone.value).toBe(phone);
      }
    });
  });

  describe('findMany', () => {
    it('should find users with pagination', async () => {
      const users = [];
      for (let i = 0; i < 10; i++) {
        const user = UserFactory.create({
          firstName: `User${i}`,
          lastName: `Test${i}`,
        });
        users.push(user);
        await repository.save(user);
      }
      
      const foundUsers = await repository.findMany({
        limit: 5,
        offset: 0,
      });
      
      expect(foundUsers).toHaveLength(5);
    });

    it('should find users with filters', async () => {
      const client = UserFactory.createClient();
      const driver = UserFactory.createDriver();
      
      await repository.save(client);
      await repository.save(driver);
      
      const clients = await repository.findMany({
        firstName: 'Client',
      });
      
      expect(clients).toHaveLength(1);
      expect(clients[0].getPropsCopy().firstName).toBe('Client');
    });

    it('should find blocked users', async () => {
      const normalUser = UserFactory.create();
      const blockedUser = UserFactory.createBlockedUser();
      
      await repository.save(normalUser);
      await repository.save(blockedUser);
      
      const blockedUsers = await repository.findMany({
        isBlocked: true,
      });
      
      expect(blockedUsers).toHaveLength(1);
      expect(blockedUsers[0].getPropsCopy().isBlocked).toBe(true);
    });

    it('should find users with device tokens', async () => {
      const userWithToken = UserFactory.create({
        deviceToken: 'test-token-123',
      });
      const userWithoutToken = UserFactory.create();
      
      await repository.save(userWithToken);
      await repository.save(userWithoutToken);
      
      const usersWithTokens = await repository.findMany({
        deviceToken: { $ne: null } as any,
      });
      
      expect(usersWithTokens.length).toBeGreaterThan(0);
    });
  });

  describe('findBlockedUsers', () => {
    it('should find currently blocked users', async () => {
      const normalUser = UserFactory.create();
      const blockedUser = UserFactory.createBlockedUser();
      const expiredUser = UserFactory.createExpiredBlockedUser();
      const permanentUser = UserFactory.createPermanentlyBlockedUser();
      
      await repository.save(normalUser);
      await repository.save(blockedUser);
      await repository.save(expiredUser);
      await repository.save(permanentUser);
      
      const blockedUsers = await repository.findBlockedUsers();
      
      expect(blockedUsers).toHaveLength(2); // blockedUser and permanentUser
    });

    it('should find users with expired blocks for cleanup', async () => {
      const expiredUser = UserFactory.createExpiredBlockedUser();
      await repository.save(expiredUser);
      
      const expiredUsers = await repository.findBlockedUsers();
      
      expect(expiredUsers).toHaveLength(0); // Should not include expired
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection error', async () => {
      const user = UserFactory.create();
      
      // Mock database error
      jest.spyOn(repository, 'save').mockRejectedValueOnce(new Error('Database connection failed'));
      
      await expect(repository.save(user)).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid phone number format', async () => {
      const user = UserFactory.create({
        phone: 'invalid-phone',
      });
      
      await expect(repository.save(user)).rejects.toThrow();
    });

    it('should handle duplicate phone numbers', async () => {
      const phone = '+77771234567';
      const user1 = UserFactory.create({ phone });
      const user2 = UserFactory.create({ phone });
      
      await repository.save(user1);
      
      await expect(repository.save(user2)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large number of users efficiently', async () => {
      const users = [];
      
      // Create 1000 users
      for (let i = 0; i < 1000; i++) {
        const user = UserFactory.create({
          firstName: `User${i}`,
          lastName: `Test${i}`,
        });
        users.push(user);
      }
      
      const startTime = Date.now();
      
      // Save all users
      for (const user of users) {
        await repository.save(user);
      }
      
      const saveTime = Date.now() - startTime;
      
      // Find users
      const findStartTime = Date.now();
      const foundUsers = await repository.findMany({ limit: 100 });
      const findTime = Date.now() - findStartTime;
      
      expect(foundUsers).toHaveLength(100);
      expect(saveTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(findTime).toBeLessThan(1000); // Should find within 1 second
    });

    it('should handle complex queries efficiently', async () => {
      // Create test data
      const clients = [];
      const drivers = [];
      
      for (let i = 0; i < 100; i++) {
        const client = UserFactory.createClient();
        const driver = UserFactory.createDriver();
        clients.push(client);
        drivers.push(driver);
        await repository.save(client);
        await repository.save(driver);
      }
      
      const startTime = Date.now();
      
      // Complex query with multiple filters
      const results = await repository.findMany({
        firstName: { $like: 'Client%' } as any,
        isBlocked: false,
        limit: 50,
      });
      
      const queryTime = Date.now() - startTime;
      
      expect(results.length).toBeLessThanOrEqual(50);
      expect(queryTime).toBeLessThan(500); // Should complete within 500ms
    });
  });
});
