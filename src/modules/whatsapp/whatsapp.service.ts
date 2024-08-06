import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { OrderRequestRepository } from '../../taxi-context/domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { WhatsappUserRepository } from '../../taxi-context/domain-repositories/whatsapp-user/whatsapp-user.repository';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { WhatsappUserEntity } from '@domain/whatsapp-users/domain/entities/whatsapp-user.entity';
import { SMSCodeRecord } from '@domain/user/types';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';

@Injectable()
export class WhatsAppService {
  private readonly apiUrl: string;
  private readonly idInstance: string;
  private readonly apiTokenInstance: string;
  smsCodeExpiresIn: number;
  smsCodeLength: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly whatsAppUserRepository: WhatsappUserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,

) {
    this.apiUrl = 'https://7103.api.greenapi.com';
    this.idInstance = process.env.GREEN_API_ID_INSTANCE as string || '';
    this.apiTokenInstance = process.env.GREEN_API_TOKEN_INSTANCE || '';
    this.smsCodeExpiresIn = 72000000;
    this.smsCodeLength = 6;
  }

  async handleIncomingMessage(input: any): Promise<boolean> {
    const chatId = input.senderData.chatId;
    const name = input.senderData.senderName;

    const phone = chatId.split('@')[0]

    const userExists = await this.whatsAppUserRepository.findOneByPhone(phone);

    const user = userExists ?
      userExists :
      await this.whatsAppUserRepository.save(WhatsappUserEntity.create({
        phone: phone,
        name: name,
      }));

    const sessionExists = await this.getSMScode(phone)

    const session = sessionExists ? sessionExists.smsCode : this.generateId()


    this.saveSMSCode(session, phone);


    const link = `${this.configService.get('BASE_URL')}/taxi/${session}`;
    await this.sendMessage(chatId, `${name}, here is your taxi link: ${link}`);
    return true;
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    const url = `${this.apiUrl}/waInstance${this.idInstance}/sendMessage/${this.apiTokenInstance}`
    const response = await axios.post(url, {
      chatId: chatId,
      message,
    });
    console.log({ 'Message sent': response.data });
  }

  private saveSMSCode(smsCode: string, phone: string): SMSCodeRecord {
    const { expDate } = this.cacheStorageService.setValueWithExp(phone, { smsCode }, this.smsCodeExpiresIn);

    return {
      smsCode,
      expDate,
    };
  }

  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }

  generateId(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}