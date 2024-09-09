import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { WhatsappUserRepository } from '../../../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';

@Injectable()
export class RejectOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly whatsappUserRepository: WhatsappUserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly whatsAppService: WhatsAppService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(orderId: string) {
    const orderRequest = await this.orderRequestRepository.findOneById(orderId);
    console.log(123)
    if (!orderRequest) {
      throw new Error('Session is expired');
    }
    await this.orderRequestRepository.delete(orderRequest);

    const user = await  this.whatsappUserRepository.findOneByPhone(orderRequest.getPropsCopy().user_phone || "")

    await this.orderRequestGateway.handleOrderRejected(user?.id.value || '');

    const userPhone = orderRequest.getPropsCopy().user_phone;

    if (userPhone) {
      const user = await this.whatsappUserRepository.findOneByPhone(userPhone);

      if (!user) {
        throw new Error("SOMETHING WENT WRONG");
      }

      await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель отменил заказ')

      // await this.orderRequestGateway.handleOrderRejected(user.id.value);

      const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);

      const driver = await this.userRepository.findOneById(orderRequest?.getPropsCopy().driverId?.value || '')

      if (clientSocketId && driver)
        await this.orderRequestGateway.emitEvent(clientSocketId, 'orderRejected', orderRequest, driver)
    }
  }
}