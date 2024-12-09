import { Injectable } from '@nestjs/common';
import admin from './firebase-admin.config';

@Injectable()
export class NotificationService {
  async sendNotification(token: string, title: string, body: string, data: Record<string, string> = {}): Promise<void> {
    try {
      if (!token || !title || !body) {
        throw new Error('Invalid parameters. Token, title, and body are required.');
      }

      const message = {
        notification: {
          title,
          body,
        },
        android: {
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
        data,
        token,
      };

      await admin.messaging().send(message);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async sendNotificationByUserId(title: string, body: string, deviceToken: string): Promise<void> {
    try {
      if (!deviceToken || !title || !body) {
        throw new Error('Invalid parameters. Device token, title, and body are required.');
      }

      const message = {
        notification: {
          title,
          body,
        },
        android: {
          notification: {
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
        token: deviceToken,
      };

      // console.log(await admin.messaging().send(message))
    } catch (error) {
      console.error('Error sending notification by userId:', error);
    }
  }
}
