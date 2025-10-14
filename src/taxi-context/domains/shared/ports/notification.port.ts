export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface NotificationPort {
  sendNotification(userId: string, notification: NotificationData): Promise<void>;
  sendNotificationByToken(token: string, notification: NotificationData): Promise<void>;
  sendBulkNotification(userIds: string[], notification: NotificationData): Promise<void>;
}
