import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { WhatsappUserRepository } from '../../../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { SMSCodeRecord } from '@domain/user/types';

@Injectable()
export class CancelOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly whatsappUserRepository: WhatsappUserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly whatsAppService: WhatsAppService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(sessionId: string) {
    const orderRequest = await this.orderRequestRepository.findOne({ sessionid: sessionId });
    if (!orderRequest) {
      throw new Error('Session is expired');
    }

    const flag = await this.getSMScode(orderRequest.getPropsCopy().user_phone || '');
    if (!flag || flag.smsCode !== sessionId) {
      throw new Error('Session is expired');
    }

    orderRequest.reject('');
    await this.orderRequestRepository.save(orderRequest);

    const session = await this.getSMScode(orderRequest.getPropsCopy().user_phone || '')
    console.log(session?.smsCode, orderRequest.getPropsCopy().sessionid)
    if(session?.smsCode == orderRequest.getPropsCopy().sessionid)
      await this.cacheStorageService.deleteValue(orderRequest.getPropsCopy().user_phone || '')


    return orderRequest.getPropsCopy();
  }
  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }
}