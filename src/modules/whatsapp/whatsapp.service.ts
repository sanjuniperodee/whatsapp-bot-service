import { Injectable } from '@nestjs/common';
import  axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly idInstance: string;
  private readonly apiTokenInstance: string;
  smsCodeExpiresIn: number;
  smsCodeLength: number;

  constructor() {
    this.apiUrl = 'https://api.green-api.com';
    this.idInstance = process.env.GREEN_API_ID_INSTANCE as string || '';
    this.apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE || '';
    this.smsCodeExpiresIn = 7200000000;
    this.smsCodeLength = 6;
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    try {
      // Проверяем настройки API
      if (!this.idInstance || !this.apiTokenInstance) {
        console.warn('WhatsApp API credentials not configured. Skipping message sending.');
        console.log(`Would send to ${chatId}: ${message}`);
        return;
      }

      const url = `${this.apiUrl}/waInstance${this.idInstance}/sendMessage/${this.apiTokenInstance}`;
      const response = await axios.post(url, {
        chatId: chatId,
        message,
      });
      console.log({ 'Message sent': response.data });
    } catch (error: any) {
      console.error('WhatsApp API Error:', error.message);
      console.log(`Failed to send to ${chatId}: ${message}`);
      
      // В случае ошибки WhatsApp API, не прерываем процесс авторизации
      // Просто логируем и продолжаем (для демо режима)
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}