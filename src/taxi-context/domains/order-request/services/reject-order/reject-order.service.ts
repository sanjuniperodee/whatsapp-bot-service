import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';

@Injectable()
export class RejectOrderService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(orderId: string) {
    const orderRequest = await this.orderRequestRepository.findOneById(orderId);
    console.log(123)
    if (!orderRequest) {
      throw new Error('Session is expired');
    }
    await this.orderRequestRepository.delete(orderRequest);

    const driver = await this.userRepository.findOneById(orderRequest?.getPropsCopy().driverId?.value || '')

    await this.orderRequestGateway.handleOrderRejected(driver?.id.value || '');

    const client = await this.userRepository.findOneById(orderRequest.getPropsCopy().clientId.value)

    if (driver && client) {
      // await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель отменил заказ')

      orderRequest.reject('123')

      if (driver)
        await this.orderRequestGateway.emitEvent(driver.id.value, 'orderRejected', orderRequest, driver)
    }
  }
}