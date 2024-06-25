import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly idInstance: string;
  private readonly apiTokenInstance: string;

  constructor(    private readonly configService: ConfigService,
  ) {
    this.apiUrl = 'https://7103.api.greenapi.com';
    this.idInstance = process.env.GREEN_API_ID_INSTANCE as string || '';
    this.apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE || '';
  }

  async handleIncomingMessage(phoneNumber: string, message: string): Promise<void> {
    const userInfo = {
      name: 'User', // You can extract the user's name from the message or metadata if available
      number: phoneNumber,
    };

    const uniqueId = '123123';
    const link = `${this.configService.get('BASE_URL')}/taxi/${uniqueId}`;
    await this.sendMessage(phoneNumber, `Here is your taxi link: ${link}`);
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    try {
      const response = await axios.post(`${this.apiUrl}/waInstance${this.idInstance}/sendMessage/${this.apiTokenInstance}`, {
        chatId: `${phoneNumber}@c.us`,
        message,
      });
      console.log('Message sent:', response.data);
    } catch (error: any) {
      console.error('Error sending message:', error.response?.data || error.message);
      throw new Error('Failed to send message');
    }
  }
}