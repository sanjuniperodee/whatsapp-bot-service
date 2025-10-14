import { NotificationService } from '@modules/firebase/notification.service';

export class MockFirebaseService implements Partial<NotificationService> {
  public sendNotification = jest.fn().mockResolvedValue(undefined);
  public sendNotificationByUserId = jest.fn().mockResolvedValue(undefined);

  // Test utilities
  public getLastNotification(): { token: string; title: string; body: string } | null {
    const calls = this.sendNotification.mock.calls;
    if (calls.length === 0) return null;
    
    const lastCall = calls[calls.length - 1];
    return {
      token: lastCall[0],
      title: lastCall[1],
      body: lastCall[2],
    };
  }

  public getAllNotifications(): Array<{ token: string; title: string; body: string }> {
    return this.sendNotification.mock.calls.map(call => ({
      token: call[0],
      title: call[1],
      body: call[2],
    }));
  }

  public getLastNotificationByUserId(): { userId: string; title: string; body: string } | null {
    const calls = this.sendNotificationByUserId.mock.calls;
    if (calls.length === 0) return null;
    
    const lastCall = calls[calls.length - 1];
    return {
      userId: lastCall[0],
      title: lastCall[1],
      body: lastCall[2],
    };
  }

  public reset(): void {
    this.sendNotification.mockClear();
    this.sendNotificationByUserId.mockClear();
  }

  public simulateError(error: Error): void {
    this.sendNotification.mockRejectedValue(error);
    this.sendNotificationByUserId.mockRejectedValue(error);
  }

  public simulateInvalidToken(): void {
    this.sendNotification.mockRejectedValue(new Error('Invalid registration token'));
  }

  public simulateNetworkError(): void {
    this.sendNotification.mockRejectedValue(new Error('Network error'));
  }
}
