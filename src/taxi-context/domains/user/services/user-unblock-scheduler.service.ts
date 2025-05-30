import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';

@Injectable()
export class UserUnblockSchedulerService {
  private readonly logger = new Logger(UserUnblockSchedulerService.name);

  @Cron(CronExpression.EVERY_MINUTE) // Проверяем каждую минуту
  async handleUnblockExpiredUsers() {
    this.logger.log('Checking for users to unblock...');

    try {
      // Находим всех заблокированных пользователей, у которых истекло время блокировки
      const usersToUnblock = await UserOrmEntity.query()
        .where('isBlocked', true)
        .whereNotNull('blockedUntil')
        .where('blockedUntil', '<=', new Date());

      if (usersToUnblock.length === 0) {
        this.logger.log('No users to unblock');
        return;
      }

      this.logger.log(`Found ${usersToUnblock.length} users to unblock`);

      // Разблокируем пользователей
      for (const user of usersToUnblock) {
        await UserOrmEntity.query()
          .findById(user.id)
          .patch({
            isBlocked: false,
            blockedUntil: undefined,
            blockReason: undefined,
            updatedAt: new Date()
          });

        this.logger.log(`User ${user.id} (${user.phone}) has been automatically unblocked`);
      }

      this.logger.log(`Successfully unblocked ${usersToUnblock.length} users`);
    } catch (error) {
      this.logger.error('Error during automatic user unblocking:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Проверяем каждый день в полночь
  async handleCleanupExpiredBlocks() {
    this.logger.debug('Cleaning up expired block records...');

    try {
      // Очищаем записи о блокировке для пользователей, которые были разблокированы более 30 дней назад
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() - 30);

      const result = await UserOrmEntity.query()
        .where('isBlocked', false)
        .whereNotNull('blockReason')
        .where('updatedAt', '<', cleanupDate)
        .patch({
          blockReason: undefined
        });

      this.logger.log(`Cleaned up ${result} old block records`);
    } catch (error) {
      this.logger.error('Error during cleanup of expired block records:', error);
    }
  }

  // Метод для принудительной проверки (для тестирования)
  async forceCheckUnblockUsers() {
    this.logger.log('Force checking for users to unblock...');
    await this.handleUnblockExpiredUsers();
  }
} 