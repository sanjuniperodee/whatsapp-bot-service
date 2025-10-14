import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ICommandHandler } from '@libs/cqrs';
import { AcceptOrderCommand } from './accept-order.command';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestGateway } from '../../order-request.gateway';
import { OrderStatus } from '@infrastructure/enums';

@Injectable()
export class AcceptOrderHandler implements ICommandHandler<AcceptOrderCommand, void> {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly userRepository: UserRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
  ) {}

  async execute(command: AcceptOrderCommand): Promise<void> {
    const { orderId, driverId } = command;

    // Находим заказ
    const orderRequest = await this.orderRequestRepository.findOneById(orderId.value);
    if (!orderRequest) {
      throw new NotFoundException('Order not found');
    }

    // Проверяем, что заказ в статусе CREATED
    if (orderRequest.getPropsCopy().orderStatus !== OrderStatus.CREATED) {
      throw new ConflictException('Order is not available for acceptance');
    }

    // Получаем водителя
    const driver = await this.userRepository.findOneById(driverId.value);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Принимаем заказ
    orderRequest.accept(driverId);

    // Сохраняем изменения
    await this.orderRequestRepository.save(orderRequest);

    // Уведомляем через WebSocket
    await this.orderRequestGateway.handleOrderAccepted(orderRequest, driver);
  }
}
