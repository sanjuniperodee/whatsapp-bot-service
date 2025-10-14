import { Injectable } from '@nestjs/common';
import { DomainEventHandler } from '@libs/ddd/domain/domain-events/domain-event-handler.base';
import { OrderCancelledEvent } from '../domain/events/order-cancelled.event';
import { OrderRequestGateway } from '../order-request.gateway';
import { UserRepository } from '../../../domain-repositories/user/user.repository';

@Injectable()
export class OrderCancelledHandler extends DomainEventHandler {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly userRepository: UserRepository,
  ) {
    super(OrderCancelledEvent);
  }

  async handle(event: OrderCancelledEvent): Promise<void> {
    const { aggregateId, clientId, driverId, reason } = event;

    try {
      // Если заказ был принят водителем - уведомляем его об отмене
      if (driverId) {
        const driver = await this.userRepository.findOneById(driverId);
        if (driver) {
          await this.orderRequestGateway.notifyDriver(driverId, 'orderCancelledByClient', {
            orderId: aggregateId,
            clientId,
            reason,
            message: 'Клиент отменил заказ',
            timestamp: Date.now()
          });
        }
      }

      // Уведомляем всех водителей об удалении заказа из списка
      await this.orderRequestGateway.broadcastToOnlineDrivers('orderDeleted', {
        orderId: aggregateId,
        reason: reason || 'cancelled',
        timestamp: Date.now()
      });

      console.log(`🚫 Заказ ${aggregateId} отменен. Причина: ${reason}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке отмены заказа:', error);
    }
  }
}
