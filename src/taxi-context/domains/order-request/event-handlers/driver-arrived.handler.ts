import { Injectable } from '@nestjs/common';
import { DomainEventHandler } from '@libs/ddd/domain/domain-events/domain-event-handler.base';
import { DriverArrivedEvent } from '../domain/events/driver-arrived.event';
import { OrderRequestGateway } from '../order-request.gateway';
import { UserRepository } from '../../../domain-repositories/user/user.repository';

@Injectable()
export class DriverArrivedHandler extends DomainEventHandler {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly userRepository: UserRepository,
  ) {
    super(DriverArrivedEvent);
  }

  async handle(event: DriverArrivedEvent): Promise<void> {
    const { aggregateId, driverId, clientId } = event;

    try {
      // Получаем данные водителя
      const driver = await this.userRepository.findOneById(driverId);
      if (!driver) {
        console.error(`❌ Водитель ${driverId} не найден для события DriverArrived`);
        return;
      }

      // Уведомляем клиента что водитель прибыл (на месте)
      await this.orderRequestGateway.notifyClient(clientId, 'driverArrived', {
        orderId: aggregateId,
        driverId,
        driver: driver.getPropsCopy(),
        message: 'Водитель прибыл и ждет вас',
        timestamp: Date.now()
      });

      console.log(`🚗 Водитель ${driverId} прибыл к клиенту ${clientId} для заказа ${aggregateId}`);
      
    } catch (error) {
      console.error('❌ Ошибка при обработке прибытия водителя:', error);
    }
  }
}
