import { Injectable } from '@nestjs/common';
import { DomainEventHandler } from '@libs/ddd/domain/domain-events/domain-event-handler.base';
import { OrderAcceptedEvent } from '../domain/events/order-accepted.event';
import { OrderRequestGateway } from '../websocket/order-request.gateway';
import { UserRepository } from '../../../domain-repositories/user/user.repository';

@Injectable()
export class OrderAcceptedHandler extends DomainEventHandler {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly userRepository: UserRepository,
  ) {
    super(OrderAcceptedEvent);
  }

  async handle(event: OrderAcceptedEvent): Promise<void> {
    const { aggregateId, driverId, clientId } = event;

    try {
      // Получаем данные водителя
      const driver = await this.userRepository.findOneById(driverId);
      if (!driver) {
        console.error(`❌ Водитель ${driverId} не найден для события OrderAccepted`);
        return;
      }

      // Уведомляем клиента о принятии заказа
      console.log(`📤 Отправляем событие orderAccepted клиенту ${clientId}`);
      await this.orderRequestGateway.notifyClient(clientId, 'orderAccepted', {
        orderId: aggregateId,
        driverId,
        driver: driver.getPropsCopy(),
        timestamp: Date.now()
      });

      // Уведомляем других водителей что заказ занят
      console.log(`📤 Отправляем событие orderTaken всем водителям`);
      await this.orderRequestGateway.broadcastToOnlineDrivers('orderTaken', {
        orderId: aggregateId,
        takenBy: driverId,
        timestamp: Date.now()
      });

      console.log(`✅ Заказ ${aggregateId} принят водителем ${driverId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке принятия заказа:', error);
    }
  }
}
