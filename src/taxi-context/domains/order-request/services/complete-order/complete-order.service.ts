import { Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { WhatsappUserRepository } from '../../../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { SMSCodeRecord } from '@domain/user/types';
import { OrderStatus } from '@infrastructure/enums';

@Injectable()
export class CompleteOrderService {
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

    if (order && order.getPropsCopy().driverId?.value == driverId && order.getPropsCopy().orderstatus == OrderStatus.ONGOING) {
      order.rideEnded();
      await this.orderRequestRepository.save(order);

      const session = await this.getSMScode(order.getPropsCopy().user_phone || '')
      if(session?.smsCode == order.getPropsCopy().sessionid)
        await this.cacheStorageService.deleteValue(order.getPropsCopy().user_phone || '')

      await this.cacheStorageService.removeOrderLocation(order.id.value, order.getPropsCopy().orderType);


      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone && driver) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Заказ завершен, оцените пожалуйста поездку')

        await this.orderRequestGateway.emitEvent(user.id.value, 'rideEnded', order, driver)
      }
    }
  }
  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }
}