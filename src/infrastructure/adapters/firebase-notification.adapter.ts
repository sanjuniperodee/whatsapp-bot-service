import { Injectable } from '@nestjs/common';
import { NotificationPort, NotificationData } from '@domain/shared/ports/notification.port';
import { NotificationService } from '@modules/firebase/notification.service';
import { UserRepository } from '../../taxi-context/domain-repositories/user/user.repository';
import { Logger } from '@libs/ddd/domain/ports/logger.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class FirebaseNotificationAdapter implements NotificationPort {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly userRepository: UserRepository,
    @Inject('Logger') private readonly logger: Logger,
  ) {}

  async sendNotification(userId: string, notification: NotificationData): Promise<void> {
    try {
      const user = await this.userRepository.findOneById(userId);
      if (!user || !user.getPropsCopy().deviceToken) {
        this.logger.warn(`User ${userId} not found or has no device token`);
        return;
      }

      await this.notificationService.sendNotificationByUserId(
        notification.title,
        notification.body,
        user.getPropsCopy().deviceToken
      );

      this.logger.debug(`Notification sent to user ${userId}: ${notification.title}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}:`, error);
      throw error;
    }
  }

  async sendNotificationByToken(token: string, notification: NotificationData): Promise<void> {
    try {
      await this.notificationService.sendNotificationByUserId(
        notification.title,
        notification.body,
        token
      );

      this.logger.debug(`Notification sent to token: ${notification.title}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to token:`, error);
      throw error;
    }
  }

  async sendBulkNotification(userIds: string[], notification: NotificationData): Promise<void> {
    try {
      const users = await Promise.all(
        userIds.map(id => this.userRepository.findOneById(id))
      );

      const validUsers = users.filter(user => 
        user && user.getPropsCopy().deviceToken
      );

      await Promise.all(
        validUsers.map(user => 
          this.sendNotification(user!.id.value, notification)
        )
      );

      this.logger.debug(`Bulk notification sent to ${validUsers.length} users: ${notification.title}`);
    } catch (error) {
      this.logger.error(`Failed to send bulk notification:`, error);
      throw error;
    }
  }
}
