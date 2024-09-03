import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/driver-arrived/driver-arrived.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { WhatsappUserRepository } from '../../../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import {
  CategoryLicenseRepository
} from '../../../../domain-repositories/category-license/category-license.repository';

@Injectable()
export class DriverArrivedService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly whatsappUserRepository: WhatsappUserRepository,
    private readonly categoryLicenseRepository: CategoryLicenseRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly whatsAppService: WhatsAppService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId) {
      const category = await this.categoryLicenseRepository.findOne({driverId: new UUID(driverId), categoryType: order.getPropsCopy().orderType})

      if(!category){
        throw new Error("You can not accept orders before registering into category");
      }

      order.driverArrived();
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone && driver) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(
          userPhone + "@c.us",
          `Вас ожидает ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`
        )
        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          await this.orderRequestGateway.emitEvent(clientSocketId, 'driverArrived', order, driver)
        }
      }
    }
  }
}