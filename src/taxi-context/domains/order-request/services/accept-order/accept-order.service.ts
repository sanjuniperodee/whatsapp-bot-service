import { Body, Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderStatus } from '@infrastructure/enums';
import { async } from 'rxjs';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { WhatsappUserRepository } from '../../../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';

@Injectable()
export class AcceptOrderService{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly whatsappUserRepository: WhatsappUserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly whatsAppService: WhatsAppService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(driverId) })

    for (const orderRequest of orderRequests)
      if (orderRequest && (orderRequest.getPropsCopy().orderstatus != OrderStatus.REJECTED && orderRequest.getPropsCopy().orderstatus != OrderStatus.COMPLETED))
        return 'You already have active order'

    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order) {
      order.accept(new UUID(driverId));
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      console.log(userPhone, driver)
      if (userPhone && driver) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель принял ваш заказ, приедет золотой кабан')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          await this.orderRequestGateway.emitEvent(clientSocketId, 'orderAccepted', order, driver)
        }
      }
    }
  }
}