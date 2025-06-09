import { Injectable } from '@nestjs/common';
import admin from './firebase-admin.config';

@Injectable()
export class NotificationService {
  async sendNotification(token: string, title: string, body: string, data: Record<string, string> = {}): Promise<void> {
    try {
      if (!token || !title || !body) {
        console.error('❌ Firebase: Недостаточно параметров для отправки уведомления');
        throw new Error('Invalid parameters. Token, title, and body are required.');
      }

      console.log(`📱 Firebase: Отправка уведомления на токен ${token.substring(0, 20)}...`);
      console.log(`📱 Firebase: Заголовок: "${title}", Текст: "${body}"`);

      const message = {
        notification: {
          title,
          body,
        },
        android: {
          notification: {
            sound: 'default',
            channelId: 'default',
            priority: 'high' as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title,
                body,
              },
            },
          },
        },
        data,
        token,
      };

      const result = await admin.messaging().send(message);
      console.log(`✅ Firebase: Уведомление успешно отправлено, ID: ${result}`);
      
    } catch (error: any) {
      console.error('❌ Firebase: Ошибка отправки уведомления:', error);
      
      // Детальная диагностика ошибок Firebase
      if (error.code === 'messaging/registration-token-not-registered') {
        console.error('🚫 Firebase: Токен не зарегистрирован или устарел');
      } else if (error.code === 'messaging/invalid-registration-token') {
        console.error('🚫 Firebase: Недействительный токен регистрации');
      } else if (error.code === 'messaging/mismatched-credential') {
        console.error('🚫 Firebase: Неверные учетные данные');
      } else {
        console.error('🚫 Firebase: Неизвестная ошибка:', error.message);
      }
      
      throw error;
    }
  }

  async sendNotificationByUserId(title: string, body: string, deviceToken: string): Promise<void> {
    try {
      if (!deviceToken || !title || !body) {
        console.error('❌ Firebase: Недостаточно параметров для отправки уведомления по userId');
        throw new Error('Invalid parameters. Device token, title, and body are required.');
      }

      console.log(`📱 Firebase: Отправка уведомления по userId на токен ${deviceToken.substring(0, 20)}...`);
      console.log(`📱 Firebase: Заголовок: "${title}", Текст: "${body}"`);

      const message = {
        notification: {
          title,
          body,
        },
        android: {
          notification: {
            sound: 'default',
            channelId: 'default',
            priority: 'high' as const,
            icon: 'ic_notification',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title,
                body,
              },
              'content-available': 1,
            },
          },
        },
        data: {
          title,
          body,
          timestamp: Date.now().toString(),
        },
        token: deviceToken,
      };

      const result = await admin.messaging().send(message);
      console.log(`✅ Firebase: Уведомление по userId успешно отправлено, ID: ${result}`);
      
    } catch (error: any) {
      console.error('❌ Firebase: Ошибка отправки уведомления по userId:', error);
      
      // Детальная диагностика ошибок Firebase
      if (error.code === 'messaging/registration-token-not-registered') {
        console.error('🚫 Firebase: Токен не зарегистрирован или устарел - нужно обновить deviceToken');
      } else if (error.code === 'messaging/invalid-registration-token') {
        console.error('🚫 Firebase: Недействительный токен регистрации - проверьте формат токена');
      } else if (error.code === 'messaging/mismatched-credential') {
        console.error('🚫 Firebase: Неверные учетные данные - проверьте конфигурацию Firebase');
      } else if (error.code === 'messaging/authentication-error') {
        console.error('🚫 Firebase: Ошибка аутентификации - проверьте service account');
      } else {
        console.error('🚫 Firebase: Неизвестная ошибка:', error.message);
      }
      
      // Не выбрасываем ошибку чтобы не прерывать основной поток
      // throw error;
    }
  }

  // Новый метод для тестирования отправки уведомлений
  async testNotification(deviceToken: string): Promise<boolean> {
    try {
      console.log(`🧪 Firebase: Тестовая отправка уведомления на токен ${deviceToken.substring(0, 20)}...`);
      
      await this.sendNotificationByUserId(
        'Aday Go - Тест',
        'Тестовое уведомление для проверки Firebase',
        deviceToken
      );
      
      return true;
    } catch (error) {
      console.error('❌ Firebase: Тестовое уведомление не удалось отправить:', error);
      return false;
    }
  }
}
