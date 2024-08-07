import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderType } from '@infrastructure/enums';

@WebSocketGateway()
export class OrderRequestGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  constructor(
    private readonly orderRequestRepository: OrderRequestRepository, // Inject your repository or service here
  ) {}

  async handleConnection(client: Socket) {
    const orderRequests = await this.orderRequestRepository.findMany({});

    for(const orderRequest of orderRequests){
      await this.handleOrderCreated(orderRequest)
    }
  }

  async handleDisconnect(client: Socket) {
  }
  async handleOrderCreated(order: OrderRequestEntity) {
    this.server.emit('newOrder', order.getPropsCopy());
  }

  async orderCanceled(order: OrderRequestEntity) {
    this.server.emit('orderCanceled', order.getPropsCopy());
  }
}
