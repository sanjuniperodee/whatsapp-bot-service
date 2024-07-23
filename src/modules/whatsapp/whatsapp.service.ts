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
    const chatId = input.instanceData.wid.split('@')[0];
    const name = 'Новый Пользователь'

    const orderRequest = OrderRequestEntity.create({
      user_phone: input.instanceData.wid.split('@')[0],
      orderType: 'TAXI'
    })

    await this.orderRequestRepository.save(orderRequest)
    await this.orderRequestGateway.handleOrderCreated(orderRequest)

    const link = `${this.configService.get('BASE_URL')}/taxi/${123}`;
    await this.sendMessage(chatId, `${name}, here is your taxi link: ${link}`);
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    try {
      const url = `${this.apiUrl}/waInstance${this.idInstance}/sendMessage/${this.apiTokenInstance}`
      const data = {
        chatId: chatId,
        message,
      }
      const response = await axios.post(url, data);
      Logger.log({ 'Message sent': response.data });
    } catch (error: any) {
      console.error('Error sending message:', error.response?.data || error.message);
      return
    }
  }
}