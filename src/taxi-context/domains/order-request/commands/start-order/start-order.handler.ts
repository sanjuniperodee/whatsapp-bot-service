import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ICommandHandler } from '@libs/cqrs';
import { StartOrderCommand } from './start-order.command';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { OrderStatus } from '@infrastructure/enums';
import { CommandHandler } from '@nestjs/cqrs';

@CommandHandler(StartOrderCommand)
@Injectable()
export class StartOrderHandler implements ICommandHandler<StartOrderCommand, void> {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
  ) {}

  async execute(command: StartOrderCommand): Promise<void> {
    const { orderId } = command;

    // Находим заказ
    const orderRequest = await this.orderRequestRepository.findOneById(orderId.value);
    if (!orderRequest) {
      throw new NotFoundException('Order not found');
    }

    // Проверяем статус заказа
    if (orderRequest.getPropsCopy().orderStatus !== OrderStatus.WAITING) {
      throw new ConflictException('Order is not in WAITING status');
    }

    // Начинаем поездку
    orderRequest.start();

    // Сохраняем изменения
    await this.orderRequestRepository.save(orderRequest);

    // Получаем водителя для уведомления
    const driverId = orderRequest.getPropsCopy().driverId;
    if (driverId) {
      const driver = await this.userRepository.findOneById(driverId.value);
      if (driver) {
        await this.orderRequestGateway.notifyClient(orderRequest.getPropsCopy().clientId.value, 'rideStarted', {
          orderId: orderRequest.id.value,
          driverId: orderRequest.getPropsCopy().driverId?.value,
          driver: driver.getPropsCopy(),
          message: 'Поездка началась',
          timestamp: Date.now()
        });
      }
    }
  }
}
