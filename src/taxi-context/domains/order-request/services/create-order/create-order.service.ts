import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/driver-arrived/driver-arrived.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { WhatsappUserRepository } from '../../../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { CreateOrderRequest } from '@domain/order-request/services/create-order/create-order-request';
import { NotFoundError } from 'rxjs';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderStatus } from '@infrastructure/enums';
import { SMSCodeRecord } from '@domain/user/types';

@Injectable()
export class CreateOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly whatsappUserRepository: WhatsappUserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly whatsAppService: WhatsAppService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: CreateOrderRequest) {
    const { phone, orderType, from, to, lat, lng, price, comment} = input;

    const session = await this.getSMScode(phone);

    if (!session?.smsCode) {
      throw new NotFoundError("Session is not found");
    }

    if (await this.orderRequestRepository.findOne({ sessionid: session.smsCode })) {
      throw new Error('Order request with this session already exists');
    }

    const orderRequest = OrderRequestEntity.create({
      orderType,
      orderstatus: OrderStatus.CREATED,
      from,
      to,
      lat,
      lng,
      price,
      comment: comment,
      sessionid: session.smsCode,
      user_phone: phone
    });

    const user = await this.whatsappUserRepository.findOneByPhone(phone)

    await this.orderRequestRepository.save(orderRequest);
    await this.orderRequestGateway.handleOrderCreated(orderRequest, user);

    return orderRequest.getPropsCopy();
  }
  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }
}