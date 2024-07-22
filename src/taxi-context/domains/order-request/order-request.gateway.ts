import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';

@WebSocketGateway()
export class OrderRequestGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer() server: Server;

  constructor(
    private readonly orderRequestRepository: OrderRequestRepository, // Inject your repository or service here
  ) {}

  async handleConnection(client: Socket) {
    const orderRequests = await this.orderRequestRepository.findMany({ orderType: 'TAXI', startTime: undefined });

    for(const orderRequest of orderRequests){
      await this.handleOrderCreated(orderRequest)
    }
  }

  async handleDisconnect(client: Socket) {
  }
  async handleOrderCreated(order: any) {
    const newOrder = await this.orderRequestRepository.findOneById(order.id.value);
    console.log(newOrder)
    // Emit the new order to all connected clients
    this.server.emit('newOrder', newOrder?.getPropsCopy());
  }
}
