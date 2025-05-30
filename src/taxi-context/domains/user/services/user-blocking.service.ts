import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../domain-repositories/user/user.repository';
import { NotificationService } from '@modules/firebase/notification.service';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';

@Injectable()
export class UserBlockingService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async checkUserBlockingAndNotify(user: UserOrmEntity): Promise<boolean> {
    const userEntity = await this.userRepository.findOneById(user.id);
    
    if (!userEntity || !userEntity.isCurrentlyBlocked()) {
      return false; // Пользователь не заблокирован
    }

    // Отправляем push уведомление о блокировке
    if (user.deviceToken) {
      const blockReason = userEntity.blockReason || 'Нарушение правил использования сервиса';
      let blockMessage = `Ваш аккаунт заблокирован. Причина: ${blockReason}`;
      
      if (userEntity.blockedUntil) {
        const unblockDate = new Date(userEntity.blockedUntil);
        const now = new Date();
        const timeDiff = unblockDate.getTime() - now.getTime();
        
        if (timeDiff > 0) {
          const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysLeft > 0) {
            blockMessage += `. Разблокировка через ${daysLeft} дн.`;
          } else {
            const hoursLeft = Math.ceil(timeDiff / (1000 * 3600));
            if (hoursLeft > 0) {
              blockMessage += `. Разблокировка через ${hoursLeft} ч.`;
            } else {
              const minutesLeft = Math.ceil(timeDiff / (1000 * 60));
              if (minutesLeft > 0) {
                blockMessage += `. Разблокировка через ${minutesLeft} мин.`;
              }
            }
          }
        }
      } else {
        blockMessage += '. Блокировка постоянная.';
      }

      await this.notificationService.sendNotificationByUserId(
        'Аккаунт заблокирован',
        blockMessage,
        user.deviceToken
      );
    }
    
    return true; // Пользователь заблокирован
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    const userEntity = await this.userRepository.findOneById(userId);
    return userEntity ? userEntity.isCurrentlyBlocked() : false;
  }
} 