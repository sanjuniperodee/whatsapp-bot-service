import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

export class MockWhatsAppService implements Partial<WhatsAppService> {
  public sendMessage = jest.fn().mockResolvedValue(undefined);
  public smsCodeExpiresIn = 7200000000;
  public smsCodeLength = 6;

  // Test utilities
  public getLastSentMessage(): { chatId: string; message: string } | null {
    const calls = this.sendMessage.mock.calls;
    if (calls.length === 0) return null;
    
    const lastCall = calls[calls.length - 1];
    return {
      chatId: lastCall[0],
      message: lastCall[1],
    };
  }

  public getAllSentMessages(): Array<{ chatId: string; message: string }> {
    return this.sendMessage.mock.calls.map(call => ({
      chatId: call[0],
      message: call[1],
    }));
  }

  public reset(): void {
    this.sendMessage.mockClear();
  }

  public simulateError(error: Error): void {
    this.sendMessage.mockRejectedValue(error);
  }

  public simulateApiFailure(): void {
    this.sendMessage.mockRejectedValue(new Error('WhatsApp API Error: 401 Unauthorized'));
  }
}
