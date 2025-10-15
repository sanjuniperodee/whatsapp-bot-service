import { BadRequestException, Body, Controller, Get, Logger, NotFoundException, Param, Post, Put, Query, UseGuards, ConflictException } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { OrderRequestGateway } from './websocket/order-request.gateway';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { CreateOrderRequest } from '@domain/order-request/services/create-order/create-order-request';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UserRepository } from '../../domain-repositories/user/user.repository';
import { JwtAuthGuard } from '@infrastructure/guards';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { MakeReviewRequest } from '@domain/order-request/services/make-review/create-order-request';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { CategoryRegisterRequest } from '@domain/order-request/services/category-register/category-register.request';
import { UpdateLocationRequest } from '@domain/order-request/services/update-location/update-location.request';
import { AcceptOrderService } from '@domain/order-request/services/accept-order/accept-order.service';
import { DriverArrivedService } from '@domain/order-request/services/driver-arrived/driver-arrived.service';
import { StartOrderService } from '@domain/order-request/services/start-order/start-order.service';
import { CompleteOrderService } from '@domain/order-request/services/complete-order/complete-order.service';
import { CreateOrderService } from '@domain/order-request/services/create-order/create-order.service';
import { CancelOrderService } from '@domain/order-request/services/cancel-order/cancel-order.service';
import { CategoryLicenseOrmEntity } from '@infrastructure/database/entities/category-license.orm-entity';
import { CategoryLicenseRepository } from '../../domain-repositories/category-license/category-license.repository';
import { CategoryLicenseEntity } from '@domain/user/domain/entities/category-license.entity';
import { RejectOrderService } from '@domain/order-request/services/reject-order/reject-order.service';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import { ReccuringProfileCallbackDto } from '@domain/order-request/ReccuringProfileCallbackDto';
import { OrderRequestResponseDto } from './dtos/order-request-response.dto';
import { UserResponseDto } from '@domain/user/dtos/user-response.dto';
import { CategoryLicenseResponseDto } from '@domain/user/dtos/category-license-response.dto';
import { OrderStatusResponseDto } from './dtos/order-status-response.dto';

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('v1/order-requests')
export class OrderRequestController {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly categoryLicenseRepository: CategoryLicenseRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userRepository: UserRepository,
    private readonly acceptOrderService: AcceptOrderService,
    private readonly driverArrivedService: DriverArrivedService,
    private readonly startOrderService: StartOrderService,
    private readonly completeOrderService: CompleteOrderService,
    private readonly createOrderService: CreateOrderService,
    private readonly cancelOrderService: CancelOrderService,
    private readonly rejectOrderService: RejectOrderService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  @Get('menu/:id')
  async getMenu(@Param('id') id: string){
    const menu = await fetch('https://api.aktau-go.kz/getmenu/' + id, {
      headers: {
        'Authorization': 'c2F0ZmFybV9tZW51X2FwaTphOTU5MGYyMjNkM2Q4M2ExNDVjNmJiZWQyMGM1NTJjZmQyZTc1OWUwMWI0YmE4NTc0OWE2YmQwZWMxOGY0MmI2'
      }
    })
    return menu.json();
  }

  @Post('log')
  async log(@Body() input: any){
    console.log(input)
    return { ok: true }
  }

  @Post('send-message-to-bekkhan')
  async sendMessageToBekkhan(@Body() input: any){
    await this.whatsAppService.sendMessage('77051479003' + "@c.us", `Новый запрос от клиента: +${input.phoneNumber}, ${input.name}`);
  }
  @Post('/location/update')
  @UseGuards(JwtAuthGuard())
  async handleLocationUpdate(
    @Body() input: UpdateLocationRequest,
    @IAM() user: UserOrmEntity
  ) {
    const { lng, lat, orderId } = input;
    if(lat && lng){
      await this.cacheStorageService.updateDriverLocation(user.id, lng, lat);
      
      if(orderId) {
        const order = await this.orderRequestRepository.findOneById(orderId)

        if(order && order.getPropsCopy().driverId?.value == user.id){
          const location = await this.cacheStorageService.getDriverLocation(user.id)

          const clientSocketId = await this.cacheStorageService.getSocketClientId(orderId);
          if (clientSocketId && !location)
            this.orderRequestGateway.server.to(clientSocketId).emit('newOrder');
        }
      }
    }
  }

  @Post('make-review')
  @ApiOperation({ summary: 'Make Review' })
  @ApiBody({ type: MakeReviewRequest })
  @ApiResponse({ status: 200, description: 'Review submitted successfully' })
  @ApiResponse({ status: 404, description: 'Order request not found' })
  async makeReview(@Body() input: MakeReviewRequest) {
    const { orderRequestId, comment, rating } = input;

    console.log("Make review started")

    const orderRequest = await this.orderRequestRepository.findOneById(orderRequestId)

    if(!orderRequest){
      throw new NotFoundException("Order request doesn't exist")
    }

    orderRequest?.rate(rating, comment)

    await this.orderRequestRepository.save(orderRequest)
  }

  @Post('reject/:orderId')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Cancel order by order id' })
  @ApiResponse({ status: 200, description: 'Order rejected successfully' })
  async cancelOrderRequestByOrderId(@Param('orderId') orderId: string) {
    return this.rejectOrderService.handle(orderId)
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get user by session id' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  async getUserBySessionId(@Param('id') id: string) {
    const user = await this.userRepository.findOneById(id)

    return user?.getPropsCopy()
  }

  @Get('client/saved-places')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get client saved places' })
  @ApiResponse({ status: 200, description: 'Saved places retrieved successfully' })
  async getClientSavedPlaces(@IAM() user: UserOrmEntity) {
    try {
      // For now, return hardcoded saved places
      // In the future, you can implement a SavedPlaces entity
      return [
        {
          id: 'home',
          icon: 'home',
          title: 'Дом',
          address: 'Актау, мкр. 5, дом 20',
          lat: 43.6532,
          lng: 51.1694,
        },
        {
          id: 'work',
          icon: 'work',
          title: 'Работа',
          address: 'Актау, ул. Мангистауская 15',
          lat: 43.6481,
          lng: 51.1647,
        },
      ];
    } catch (error) {
      console.error('Error getting saved places:', error);
      throw error;
    }
  }

  @Get('client/recent-addresses')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get client recent addresses' })
  @ApiResponse({ status: 200, description: 'Recent addresses retrieved successfully' })
  async getClientRecentAddresses(@IAM() user: UserOrmEntity) {
    try {
      // Get recent destinations from completed orders
      const recentOrders = await OrderRequestOrmEntity.query()
        .where('clientId', user.id)
        .where('orderStatus', OrderStatus.COMPLETED)
        .orderBy('createdAt', 'desc')
        .limit(10);

      const uniqueAddresses = [];
      const seenAddresses = new Set();

      for (const order of recentOrders) {
        if (!seenAddresses.has(order.to) && order.to) {
          seenAddresses.add(order.to);
          uniqueAddresses.push({
            address: order.to,
            lat: order.lat,
            lng: order.lng,
          });
        }
        if (uniqueAddresses.length >= 5) break;
      }

      return uniqueAddresses;
    } catch (error) {
      console.error('Error getting recent addresses:', error);
      throw error;
    }
  }
}
