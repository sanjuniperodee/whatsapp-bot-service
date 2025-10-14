import { Injectable } from '@nestjs/common';
import { DomainEventHandler } from '@libs/ddd/domain/domain-events/domain-event-handler.base';
import { OrderStartedEvent } from '../domain/events/order-started.event';
import { OrderRequestGateway } from '../order-request.gateway';
import { UserRepository } from '../../../domain-repositories/user/user.repository';

@Injectable()
export class OrderStartedHandler extends DomainEventHandler {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly userRepository: UserRepository,
  ) {
    super(OrderStartedEvent);
  }

  async handle(event: OrderStartedEvent): Promise<void> {
    const { aggregateId, driverId, clientId } = event;

    try {
      // Получаем данные водителя
      const driver = await this.userRepository.findOneById(driverId);
      if (!driver) {
        console.error(`❌ Водитель ${driverId} не найден для события OrderStarted`);
        return;
      }

      // Уведомляем клиента что поездка началась
      await this.orderRequestGateway.notifyClient(clientId, 'rideStarted', {
        orderId: aggregateId,
        driverId,
        driver: driver.getPropsCopy(),
        message: 'Поездка началась',
        timestamp: Date.now()
      });

      console.log(`🚀 Поездка началась: заказ ${aggregateId}, водитель ${driverId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке начала поездки:', error);
    }
  }
}
