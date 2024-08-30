import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/driver-arrived/driver-arrived.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { WhatsappUserRepository } from '../../../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';

@Injectable()
export class DriverArrivedService {
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
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId) {
      order.driverArrived();
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone && driver) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель приехал, вас ожидает золотой кабан')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          await this.orderRequestGateway.emitEvent(clientSocketId, 'driverArrived', order, driver)
        }
      }
    }
  }
}