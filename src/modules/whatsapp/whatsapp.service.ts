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
    const url = `${this.apiUrl}/waInstance${this.idInstance}/sendMessage/${this.apiTokenInstance}`
    const response = await axios.post(url, {
      chatId: chatId,
      message,
    });
    console.log({ 'Message sent': response.data });
  }
}