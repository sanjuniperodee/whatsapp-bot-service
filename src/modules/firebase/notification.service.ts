import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import firebaseAdmin from './firebase-admin.config';

@Injectable()
export class NotificationService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    try {
      this.messaging = firebaseAdmin.messaging();
      console.log('📱 NotificationService: Firebase Messaging инициализирован');
    } catch (error) {
      console.error('❌ NotificationService: Ошибка инициализации messaging:', error);
    }
  }

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

      const result = await this.messaging.send(message);
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
    if (!deviceToken) {
      console.warn('⚠️ Firebase: Попытка отправки уведомления без deviceToken');
      return;
    }

    if (!this.messaging) {
      console.error('❌ Firebase: Messaging не инициализирован');
      return;
    }

    // Валидация токена (базовая проверка)
    if (deviceToken.length < 10 || deviceToken === 'test') {
      console.warn(`⚠️ Firebase: Подозрительный deviceToken: ${deviceToken.substring(0, 20)}...`);
      return;
    }

    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: {
        timestamp: new Date().toISOString(),
      },
      token: deviceToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    try {
      console.log(`📱 Firebase: Отправка уведомления по userId на токен ${deviceToken.substring(0, 20)}...`);
      console.log(`📱 Firebase: Заголовок: "${title}", Текст: "${body}"`);
      
      const response = await this.messaging.send(message);
      console.log(`✅ Firebase: Уведомление успешно отправлено. Message ID: ${response}`);
      
    } catch (error) {
      console.error('❌ Firebase: Ошибка отправки уведомления по userId:', error);
      
      // Детальная диагностика ошибок
      if (error.code) {
        switch (error.code) {
          case 'messaging/invalid-registration-token':
            console.log('🔍 Firebase: Недействительный токен регистрации');
            break;
          case 'messaging/registration-token-not-registered':
            console.log('🔍 Firebase: Токен не зарегистрирован');
            break;
          case 'messaging/invalid-argument':
            console.log('🔍 Firebase: Недействительные аргументы сообщения');
            break;
          case 'app/invalid-credential':
          case 'auth/invalid-credential':
            console.log('🔍 Firebase: Недействительные учетные данные - требуется обновление service account');
            break;
          default:
            console.log(`🔍 Firebase: Неизвестная ошибка: ${error.code}`);
        }
      }
      
      // Не бросаем ошибку, чтобы не ломать основной процесс
    }
  }

  async sendNotificationToTopic(title: string, body: string, topic: string): Promise<void> {
    if (!this.messaging) {
      console.error('❌ Firebase: Messaging не инициализирован');
      return;
    }

    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      topic,
    };

    try {
      console.log(`📢 Firebase: Отправка уведомления на топик "${topic}"`);
      const response = await this.messaging.send(message);
      console.log(`✅ Firebase: Уведомление на топик отправлено. Message ID: ${response}`);
    } catch (error) {
      console.error(`❌ Firebase: Ошибка отправки уведомления на топик "${topic}":`, error);
    }
  }

  async validateToken(token: string): Promise<boolean> {
    if (!this.messaging || !token || token === 'test') {
      return false;
    }

    try {
      // Простая валидация отправкой тестового сообщения
      await this.messaging.send({
        data: { test: 'validation' },
        token,
      }, true); // dry run
      return true;
    } catch (error) {
      console.log(`🔍 Firebase: Токен ${token.substring(0, 20)}... невалидный:`, error.code);
      return false;
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
