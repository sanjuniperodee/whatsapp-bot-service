import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { OrderRequestRepository } from '../../taxi-context/domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';

@Injectable()
export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly idInstance: string;
  private readonly apiTokenInstance: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,

) {
    this.apiUrl = 'https://7103.api.greenapi.com';
    this.idInstance = process.env.GREEN_API_ID_INSTANCE as string || '';
    this.apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE || '';
  }

  async handleIncomingMessage(input: any): Promise<void> {
    const chatId = input.instanceData.wid;
    const name = 'Новый Пользователь';

    const link = `${this.configService.get('BASE_URL')}/taxi/${123}`;
    await this.sendMessage(chatId, `${name}, here is your taxi link: ${link}`);
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