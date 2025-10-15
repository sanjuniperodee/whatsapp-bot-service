import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ICommandHandler } from '@libs/cqrs';
import { CancelOrderCommand } from './cancel-order.command';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { OrderStatus } from '@infrastructure/enums';

@Injectable()
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand, void> {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    const { orderId, reason } = command;

    // Находим заказ
    const orderRequest = await this.orderRequestRepository.findOneById(orderId.value);
    if (!orderRequest) {
      throw new NotFoundException('Order not found');
    }

    // Проверяем, что заказ можно отменить
    const currentStatus = orderRequest.getPropsCopy().orderStatus;
    if (![OrderStatus.CREATED, OrderStatus.STARTED, OrderStatus.WAITING, OrderStatus.ONGOING].includes(currentStatus)) {
      throw new ConflictException('Order cannot be cancelled in current status');
    }

    // Отменяем заказ
    orderRequest.rejectByClient();

    // Сохраняем изменения
    await this.orderRequestRepository.save(orderRequest);

    // Уведомляем через WebSocket
    await this.orderRequestGateway.handleOrderCancelledByClient(orderRequest, reason);
  }
}
