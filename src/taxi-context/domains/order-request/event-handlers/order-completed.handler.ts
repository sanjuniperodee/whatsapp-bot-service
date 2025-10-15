import { Injectable } from '@nestjs/common';
import { DomainEventHandler } from '@libs/ddd/domain/domain-events/domain-event-handler.base';
import { OrderCompletedEvent } from '../domain/events/order-completed.event';
import { OrderRequestGateway } from '../websocket/order-request.gateway';
import { UserRepository } from '../../../domain-repositories/user/user.repository';

@Injectable()
export class OrderCompletedHandler extends DomainEventHandler {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly userRepository: UserRepository,
  ) {
    super(OrderCompletedEvent);
  }

  async handle(event: OrderCompletedEvent): Promise<void> {
    const { aggregateId, driverId, clientId, price } = event;

    try {
      // Получаем данные водителя
      const driver = await this.userRepository.findOneById(driverId);
      if (!driver) {
        console.error(`❌ Водитель ${driverId} не найден для события OrderCompleted`);
        return;
      }

      // Уведомляем клиента что поездка завершена
      await this.orderRequestGateway.notifyClient(clientId, 'rideEnded', {
        orderId: aggregateId,
        driverId,
        driver: driver.getPropsCopy(),
        price,
        message: 'Поездка завершена',
        timestamp: Date.now()
      });

      console.log(`🏁 Поездка завершена: заказ ${aggregateId}, водитель ${driverId}, цена ${price}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке завершения поездки:', error);
    }
  }
}
