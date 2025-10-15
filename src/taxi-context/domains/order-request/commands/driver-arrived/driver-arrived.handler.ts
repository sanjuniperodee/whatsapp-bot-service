import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ICommandHandler } from '@libs/cqrs';
import { DriverArrivedCommand } from './driver-arrived.command';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { OrderStatus } from '@infrastructure/enums';
import { CommandHandler } from '@nestjs/cqrs';

@CommandHandler(DriverArrivedCommand)
@Injectable()
export class DriverArrivedCommandHandler implements ICommandHandler<DriverArrivedCommand, void> {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
  ) {}

  async execute(command: DriverArrivedCommand): Promise<void> {
    const { orderId } = command;

    // Находим заказ
    const orderRequest = await this.orderRequestRepository.findOneById(orderId.value);
    if (!orderRequest) {
      throw new NotFoundException('Order not found');
    }

    // Проверяем статус заказа
    if (orderRequest.getPropsCopy().orderStatus !== OrderStatus.STARTED) {
      throw new ConflictException('Order is not in STARTED status');
    }

    // Отмечаем, что водитель прибыл
    orderRequest.driverArrived();

    // Сохраняем изменения
    await this.orderRequestRepository.save(orderRequest);

    // Получаем водителя для уведомления
    const driverId = orderRequest.getPropsCopy().driverId;
    if (driverId) {
      const driver = await this.userRepository.findOneById(driverId.value);
      if (driver) {
        console.log('🔍 [DRIVER ARRIVED HANDLER] Sending notification...');
        await this.orderRequestGateway.notifyClient(orderRequest.getPropsCopy().clientId.value, 'driverArrived', {
          orderId: orderRequest.id.value,
          driverId: orderRequest.getPropsCopy().driverId?.value,
          driver: driver.getPropsCopy(),
          message: 'Водитель прибыл и ждет вас',
          timestamp: Date.now()
        });
      }
    } else {
      console.log('❌ [DRIVER ARRIVED HANDLER] No driver ID found');
    }
  }
}
