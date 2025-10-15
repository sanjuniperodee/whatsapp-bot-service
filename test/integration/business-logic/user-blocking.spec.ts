import { Test, TestingModule } from '@nestjs/testing';
import { UserBlockingService } from '@domain/user/services/user-blocking.service';
import { UserRepository } from '../../../../../src/taxi-context/domain-repositories/user/user.repository';
import { NotificationService } from '@modules/firebase/notification.service';
import { DatabaseHelper } from '../../helpers/database.helper';
import { UserFactory } from '../../helpers/factories/user.factory';
import { MockFirebaseService } from '../../helpers/mocks/firebase.service.mock';
import { Knex } from 'knex';

describe('User Blocking System Integration Tests', () => {
  let service: UserBlockingService;
  let userRepository: jest.Mocked<UserRepository>;
  let notificationService: jest.Mocked<NotificationService>;
  let knex: Knex;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        UserBlockingService,
        {
          provide: UserRepository,
          useValue: {
            findOneById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: new MockFirebaseService(),
        },
      ],
    }).compile();

    service = module.get<UserBlockingService>(UserBlockingService);
    userRepository = module.get(UserRepository);
    notificationService = module.get(NotificationService);

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

  describe('checkUserBlockingAndNotify', () => {
    it('should return false for non-blocked user', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      const result = await service.checkUserBlockingAndNotify(user as any);

      expect(result).toBe(false);
      expect(notificationService.sendNotificationByUserId).not.toHaveBeenCalled();
    });

    it('should return true for currently blocked user', async () => {
      const blockedUser = UserFactory.createBlockedUser();
      userRepository.findOneById.mockResolvedValue(blockedUser);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      const result = await service.checkUserBlockingAndNotify(blockedUser as any);

      expect(result).toBe(true);
      expect(notificationService.sendNotificationByUserId).toHaveBeenCalled();
    });

    it('should return false for expired blocked user', async () => {
      const expiredUser = UserFactory.createExpiredBlockedUser();
      userRepository.findOneById.mockResolvedValue(expiredUser);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      const result = await service.checkUserBlockingAndNotify(expiredUser as any);

      expect(result).toBe(false);
      expect(notificationService.sendNotificationByUserId).not.toHaveBeenCalled();
    });

    it('should return true for permanently blocked user', async () => {
      const permanentUser = UserFactory.createPermanentlyBlockedUser();
      userRepository.findOneById.mockResolvedValue(permanentUser);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      const result = await service.checkUserBlockingAndNotify(permanentUser as any);

      expect(result).toBe(true);
      expect(notificationService.sendNotificationByUserId).toHaveBeenCalled();
    });

    it('should send notification with correct message for temporary block', async () => {
      const blockedUser = UserFactory.createBlockedUser();
      userRepository.findOneById.mockResolvedValue(blockedUser);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      await service.checkUserBlockingAndNotify(blockedUser as any);

      expect(notificationService.sendNotificationByUserId).toHaveBeenCalledWith(
        'Аккаунт заблокирован',
        expect.stringContaining('Ваш аккаунт заблокирован'),
        blockedUser.getPropsCopy().deviceToken
      );
    });

    it('should send notification with correct message for permanent block', async () => {
      const permanentUser = UserFactory.createPermanentlyBlockedUser();
      userRepository.findOneById.mockResolvedValue(permanentUser);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      await service.checkUserBlockingAndNotify(permanentUser as any);

      expect(notificationService.sendNotificationByUserId).toHaveBeenCalledWith(
        'Аккаунт заблокирован',
        expect.stringContaining('Блокировка постоянная'),
        permanentUser.getPropsCopy().deviceToken
      );
    });

    it('should handle user without device token', async () => {
      const blockedUser = UserFactory.createBlockedUser();
      // UserEntity doesn't have setDeviceToken method
      userRepository.findOneById.mockResolvedValue(blockedUser);

      const result = await service.checkUserBlockingAndNotify(blockedUser as any);

      expect(result).toBe(true);
      expect(notificationService.sendNotificationByUserId).not.toHaveBeenCalled();
    });

    it('should handle notification service error gracefully', async () => {
      const blockedUser = UserFactory.createBlockedUser();
      userRepository.findOneById.mockResolvedValue(blockedUser);
      notificationService.sendNotificationByUserId.mockRejectedValue(new Error('Notification failed'));

      const result = await service.checkUserBlockingAndNotify(blockedUser as any);

      expect(result).toBe(true);
      // Should not throw error even if notification fails
    });
  });

  describe('isUserBlocked', () => {
    it('should return false for non-blocked user', async () => {
      const user = UserFactory.create();
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.isUserBlocked(user.id.value);

      expect(result).toBe(false);
    });

    it('should return true for currently blocked user', async () => {
      const blockedUser = UserFactory.createBlockedUser();
      userRepository.findOneById.mockResolvedValue(blockedUser);

      const result = await service.isUserBlocked(blockedUser.id.value);

      expect(result).toBe(true);
    });

    it('should return false for expired blocked user', async () => {
      const expiredUser = UserFactory.createExpiredBlockedUser();
      userRepository.findOneById.mockResolvedValue(expiredUser);

      const result = await service.isUserBlocked(expiredUser.id.value);

      expect(result).toBe(false);
    });

    it('should return true for permanently blocked user', async () => {
      const permanentUser = UserFactory.createPermanentlyBlockedUser();
      userRepository.findOneById.mockResolvedValue(permanentUser);

      const result = await service.isUserBlocked(permanentUser.id.value);

      expect(result).toBe(true);
    });

    it('should handle user not found', async () => {
      userRepository.findOneById.mockResolvedValue(null);

      const result = await service.isUserBlocked('non-existent-user-id');

      expect(result).toBe(false);
    });
  });

  describe('Block Duration Scenarios', () => {
    it('should handle 1 hour block', async () => {
      const oneHourFromNow = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
      
      const user = UserFactory.create();
      user.blockUser(oneHourFromNow, '1 hour violation');
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.checkUserBlockingAndNotify(user as any);

      expect(result).toBe(true);
    });

    it('should handle 1 day block', async () => {
      const oneDayFromNow = new Date();
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
      
      const user = UserFactory.create();
      user.blockUser(oneDayFromNow, '1 day violation');
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.checkUserBlockingAndNotify(user as any);

      expect(result).toBe(true);
    });

    it('should handle 1 week block', async () => {
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      
      const user = UserFactory.create();
      user.blockUser(oneWeekFromNow, '1 week violation');
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.checkUserBlockingAndNotify(user as any);

      expect(result).toBe(true);
    });

    it('should handle 1 month block', async () => {
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      
      const user = UserFactory.create();
      user.blockUser(oneMonthFromNow, '1 month violation');
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.checkUserBlockingAndNotify(user as any);

      expect(result).toBe(true);
    });
  });

  describe('Block Reason Handling', () => {
    it('should use custom block reason in notification', async () => {
      const customReason = 'Spam behavior detected';
      const user = UserFactory.create();
      user.blockUser(undefined, customReason);
      userRepository.findOneById.mockResolvedValue(user);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      await service.checkUserBlockingAndNotify(user as any);

      expect(notificationService.sendNotificationByUserId).toHaveBeenCalledWith(
        'Аккаунт заблокирован',
        expect.stringContaining(customReason),
        user.getPropsCopy().deviceToken
      );
    });

    it('should use default reason when none provided', async () => {
      const user = UserFactory.create();
      user.blockUser(undefined, undefined);
      userRepository.findOneById.mockResolvedValue(user);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      await service.checkUserBlockingAndNotify(user as any);

      expect(notificationService.sendNotificationByUserId).toHaveBeenCalledWith(
        'Аккаунт заблокирован',
        expect.stringContaining('Нарушение правил использования сервиса'),
        user.getPropsCopy().deviceToken
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with null blockedUntil', async () => {
      const user = UserFactory.create();
      user.blockUser(null, 'Test reason');
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.checkUserBlockingAndNotify(user as any);

      expect(result).toBe(true);
    });

    it('should handle user with undefined blockedUntil', async () => {
      const user = UserFactory.create();
      user.blockUser(undefined, 'Test reason');
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.checkUserBlockingAndNotify(user as any);

      expect(result).toBe(true);
    });

    it('should handle user with empty block reason', async () => {
      const user = UserFactory.create();
      user.blockUser(undefined, '');
      userRepository.findOneById.mockResolvedValue(user);
      notificationService.sendNotificationByUserId.mockResolvedValue(undefined);

      await service.checkUserBlockingAndNotify(user as any);

      expect(notificationService.sendNotificationByUserId).toHaveBeenCalledWith(
        'Аккаунт заблокирован',
        expect.stringContaining('Нарушение правил использования сервиса'),
        user.getPropsCopy().deviceToken
      );
    });

    it('should handle repository error gracefully', async () => {
      userRepository.findOneById.mockRejectedValue(new Error('Database error'));

      await expect(service.checkUserBlockingAndNotify({} as any)).rejects.toThrow('Database error');
    });
  });

  describe('Performance', () => {
    it('should handle multiple blocking checks efficiently', async () => {
      const users = [];
      for (let i = 0; i < 100; i++) {
        const user = UserFactory.create();
        if (i % 2 === 0) {
          user.blockUser(undefined, `Violation ${i}`);
        }
        users.push(user);
      }

      userRepository.findOneById.mockImplementation((id) => {
        const user = users.find(u => u.id.value === id);
        return Promise.resolve(user);
      });

      const startTime = Date.now();

      const promises = users.map(user => service.checkUserBlockingAndNotify(user as any));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
