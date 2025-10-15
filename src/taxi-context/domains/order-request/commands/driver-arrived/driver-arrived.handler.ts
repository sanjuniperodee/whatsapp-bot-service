import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ICommandHandler } from '@libs/cqrs';
import { DriverArrivedCommand } from './driver-arrived.command';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { OrderStatus } from '@infrastructure/enums';

@Injectable()
export class DriverArrivedCommandHandler implements ICommandHandler<DriverArrivedCommand, void> {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
  ) {}

  async execute(command: DriverArrivedCommand): Promise<void> {
    console.log('🔍 [DRIVER ARRIVED HANDLER] Starting driver arrived handler');
    const { orderId } = command;
    console.log('🔍 [DRIVER ARRIVED HANDLER] OrderId:', orderId.value);

    // Находим заказ
    const orderRequest = await this.orderRequestRepository.findOneById(orderId.value);
    console.log('🔍 [DRIVER ARRIVED HANDLER] Found order:', orderRequest ? 'YES' : 'NO');
    if (!orderRequest) {
      console.log('❌ [DRIVER ARRIVED HANDLER] Order not found');
      throw new NotFoundException('Order not found');
    }

    // Проверяем статус заказа
    console.log('🔍 [DRIVER ARRIVED HANDLER] Order status:', orderRequest.getPropsCopy().orderStatus);
    if (orderRequest.getPropsCopy().orderStatus !== OrderStatus.STARTED) {
      console.log('❌ [DRIVER ARRIVED HANDLER] Order is not in STARTED status');
      throw new ConflictException('Order is not in STARTED status');
    }

    // Отмечаем, что водитель прибыл
    console.log('🔍 [DRIVER ARRIVED HANDLER] Setting driver arrived...');
    orderRequest.driverArrived();
    console.log('🔍 [DRIVER ARRIVED HANDLER] Driver arrived set, saving...');

    // Сохраняем изменения
    await this.orderRequestRepository.save(orderRequest);
    console.log('🔍 [DRIVER ARRIVED HANDLER] Order saved successfully');

    // Получаем водителя для уведомления
    const driverId = orderRequest.getPropsCopy().driverId;
    console.log('🔍 [DRIVER ARRIVED HANDLER] DriverId:', driverId?.value);
    if (driverId) {
      const driver = await this.userRepository.findOneById(driverId.value);
      console.log('🔍 [DRIVER ARRIVED HANDLER] Driver found:', driver ? 'YES' : 'NO');
      if (driver) {
        console.log('🔍 [DRIVER ARRIVED HANDLER] Sending notification...');
        await this.orderRequestGateway.notifyClient(orderRequest.getPropsCopy().clientId.value, 'driverArrived', {
          orderId: orderRequest.id.value,
          driverId: orderRequest.getPropsCopy().driverId?.value,
          driver: driver.getPropsCopy(),
          message: 'Водитель прибыл и ждет вас',
          timestamp: Date.now()
        });
        console.log('🔍 [DRIVER ARRIVED HANDLER] Notification sent successfully');
      }
    } else {
      console.log('❌ [DRIVER ARRIVED HANDLER] No driver ID found');
    }
    console.log('🔍 [DRIVER ARRIVED HANDLER] Driver arrived handler completed');
  }
}
