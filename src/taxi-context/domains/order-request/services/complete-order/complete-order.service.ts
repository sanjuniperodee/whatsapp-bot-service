import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
// import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { SMSCodeRecord } from '@domain/user/types';
import { OrderStatus } from '@infrastructure/enums';

@Injectable()
export class CompleteOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    // private readonly whatsAppService: WhatsAppService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId && order.getPropsCopy().orderstatus == OrderStatus.ONGOING) {
      order.rideEnded();
      await this.orderRequestRepository.save(order);

      await this.cacheStorageService.removeOrderLocation(order.id.value, order.getPropsCopy().orderType);


      const driver = await this.userRepository.findOneById(driverId)

      const client = await this.userRepository.findOneById(order.getPropsCopy().clientId.value)
      if (client && driver) {

        // await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Заказ завершен, оцените пожалуйста поездку')

        await this.orderRequestGateway.emitEvent(client.id.value, 'rideEnded', order, driver)
      }
    }
  }
}