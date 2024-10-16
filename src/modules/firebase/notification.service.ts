import { Injectable } from '@nestjs/common';

import admin from './firebase-admin.config';

@Injectable()
export class NotificationService {
  async sendNotification(token: string, title: string, body: string, data: any): Promise<void> {
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
  }

  async sendNotificationByUserId(title: string, body: string, deviceToken: string): Promise<void> {
    try {
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
      await admin.messaging().send(message);
    } catch (error) {}
  }
}
