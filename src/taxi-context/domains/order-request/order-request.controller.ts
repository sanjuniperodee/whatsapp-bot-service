import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { CreateOrderRequest } from '@domain/order-request/services/create-order/create-order-request';
import { SMSCodeRecord } from '@domain/user/types';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { OrderStatus, OrderType } from '@infrastructure/enums';
import { UserRepository } from '../../domain-repositories/user/user.repository';
import { JwtAuthGuard } from '@infrastructure/guards';
import { WhatsappUserRepository } from '../../domain-repositories/whatsapp-user/whatsapp-user.repository';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { MakeReviewRequest } from '@domain/order-request/services/make-review/create-order-request';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
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
    private readonly whatsAppService: WhatsAppService,
    private readonly whatsappUserRepository: WhatsappUserRepository,
    private readonly acceptOrderService: AcceptOrderService,
    private readonly driverArrivedService: DriverArrivedService,
    private readonly startOrderService: StartOrderService,
    private readonly completeOrderService: CompleteOrderService,
    private readonly createOrderService: CreateOrderService,
    private readonly cancelOrderService: CancelOrderService,
    private readonly rejectOrderService: RejectOrderService,
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
  @Post()
  @UseGuards(JwtAuthGuard())
  async handleLocationUpdate(
    @Body() input: UpdateLocationRequest,
    @IAM() user: UserOrmEntity
  ) {
    const { lng, lat, clientId } = input;
    await this.cacheStorageService.updateDriverLocation(user.id, lng, lat);

    const clientSocketId = await this.cacheStorageService.getSocketClientId(clientId);
    if (clientSocketId) {
      // await this.orderRequestGateway.emitEvent(clientSocketId, 'driverLocation', { lng, lat })
    }
  }

  @Get('status/:session')
  @ApiOperation({ summary: 'Get order status' })
  @ApiBody({ type: MakeReviewRequest })
  async getOrderStatus(@Param('session') session: string) {
    const orderRequest = await this.orderRequestRepository.findOne({ sessionid: session });
    if (!orderRequest) {
      throw new Error('Session is expired!');
    }

    const driverId = orderRequest.getPropsCopy().driverId?.value

    const driver = driverId ? await this.userRepository.findOneById(driverId) : undefined;

    const orderRequests = await OrderRequestOrmEntity.query().whereNotNull('rating')

    const location = await this.cacheStorageService.getDriverLocation(driverId || '');

    return {
      order: orderRequest.getPropsCopy(),
      driver: { ...driver?.getPropsCopy(), location },
      status: orderRequest.getPropsCopy().orderstatus,
      reviews: orderRequests.length
    }
  }

  @Post('make-review')
  @ApiOperation({ summary: 'Make Review' })
  @ApiBody({ type: MakeReviewRequest })
  async makeReview(@Body() input: MakeReviewRequest) {
    const { orderRequestId, comment, rating } = input;

    const orderRequest = await this.orderRequestRepository.findOneById(orderRequestId)

    if(!orderRequest){
      throw new Error("Order request doesn't exist")
    }
    await OrderRequestOrmEntity.query().updateAndFetchById(orderRequestId, {
      'rating': rating
    })

    orderRequest?.rate(rating)

    await this.orderRequestRepository.save(orderRequest)
  }

  @Post('category/register')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Register for category' })
  @ApiBody({ type: CategoryRegisterRequest })
  async categoryRegister(@Body() input: CategoryRegisterRequest, @IAM() user: UserOrmEntity) {
    const {governmentNumber, model, SSN, type, color, brand} = input

    const isExists = await this.categoryLicenseRepository.findMany({driverId: new UUID(user.id), categoryType: type})

    if(isExists.length > 0){
      throw new Error("You already registered to this category")
    }

    const categoryLicenseEntity = CategoryLicenseEntity.create({
      SSN: SSN,
      brand: brand,
      categoryType: type,
      color: color,
      driverId: new UUID(user.id),
      model: model,
      number: governmentNumber
    })

    await this.categoryLicenseRepository.save(categoryLicenseEntity)
  }

  @Get('category/info')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Info about registration by category' })
  async categoryInfo(@IAM() user: UserOrmEntity) {
    return await CategoryLicenseOrmEntity.query().where({ 'driverId': user.id });
  }

  @Post('create-order')
  @ApiOperation({ summary: 'Creating order request' })
  @ApiBody({ type: CreateOrderRequest })
  async createOrder(@Body() input: CreateOrderRequest) {
    return this.createOrderService.handle(input)
  }


  @UseGuards(JwtAuthGuard())
  @Get('active/:type')
  @ApiOperation({ summary: 'Get active orders by type' })
  async getActiveOrdersByType(@Param('type') type: OrderType) {
    const orderRequests = await this.orderRequestRepository.findMany({ orderstatus: OrderStatus.CREATED, orderType: type })

    orderRequests.sort((a, b) => new Date(b.createdAt.value).getTime() - new Date(a.createdAt.value).getTime());

    return await Promise.all(orderRequests.map(async orderRequest => {
      const user = await this.whatsappUserRepository.findOneByPhone(orderRequest.getPropsCopy().user_phone || '');
      return {
        user,
        orderRequest
      }
    }))
  }

  @UseGuards(JwtAuthGuard())
  @Get('active-orders')
  @ApiOperation({ summary: 'Get active orders' })
  async getActiveOrders(@IAM() user: UserOrmEntity) {
    const driverLocation = await this.cacheStorageService.getDriverLocation(user.id);
    if (!driverLocation) {
      throw new Error('Driver location not found');
    }

    const nearbyOrders = await this.cacheStorageService.findNearestOrders(driverLocation.latitude, driverLocation.longitude, 20000);

    const orderRequests = await Promise.all(
      nearbyOrders.map(async orderId => {
        const orderRequest = await this.orderRequestRepository.findOneById(orderId);
        return orderRequest || null;
      })
    );

    // Фильтрация null значений перед сортировкой
    const validOrderRequests = orderRequests.filter(orderRequest => orderRequest !== null);

    validOrderRequests.sort((a, b) => new Date(b!.createdAt.value).getTime() - new Date(a!.createdAt.value).getTime());

    validOrderRequests.forEach(orderRequest => {
      const orderLocation = orderRequest!.getPropsCopy();

      // Проверяем, что координаты заказа определены
      if (orderLocation.lat !== undefined && orderLocation.lng !== undefined) {
        const distance = this.calculateDistance(driverLocation.latitude, driverLocation.longitude, orderLocation.lat, orderLocation.lng);
        console.log(`Расстояние до заказа ${orderRequest!.id.value}: ${distance.toFixed(2)} км`);
      } else {
        console.log(`Координаты для заказа ${orderRequest!.id.value} не определены.`);
      }
    });

    // Возвращаем заказы с информацией о пользователе
    return await Promise.all(validOrderRequests.map(async orderRequest => {
      const orderUser = await this.whatsappUserRepository.findOneByPhone(orderRequest!.getPropsCopy().user_phone || '');
      return {
        user: orderUser?.getPropsCopy(),
        orderRequest: orderRequest!.getPropsCopy()
      };
    }));
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Радиус Земли в километрах
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Расстояние в километрах
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }


  @UseGuards(JwtAuthGuard())
  @Get('my-active-order')
  @ApiOperation({ summary: 'Get my current order' })
  async getMyActiveOrder(@IAM() user?: UserOrmEntity) {
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(user?.id || '')})
    for (const orderRequest of orderRequests)
      if(orderRequest && (orderRequest.getPropsCopy().orderstatus != OrderStatus.REJECTED && orderRequest.getPropsCopy().orderstatus != OrderStatus.COMPLETED)){
        const whatsappUser = await this.whatsappUserRepository.findOneByPhone(orderRequest.getPropsCopy().user_phone || '');
        console.log({ whatsappUser, orderRequest })
        return { whatsappUser, orderRequest }
      }

    return 'You dont have active order'
  }

  @UseGuards(JwtAuthGuard())
  @Get('history')
  @ApiOperation({ summary: 'Get my order history' })
  async getMyOrderHistory(@IAM() user: UserOrmEntity) {
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(user.id)})
    orderRequests.sort((a, b) => new Date(b.createdAt.value).getTime() - new Date(a.createdAt.value).getTime());

    return Promise.all(
      orderRequests.map(async orderRequest => {
        if (
          orderRequest &&
          (orderRequest.getPropsCopy().orderstatus != OrderStatus.REJECTED ||
          orderRequest.getPropsCopy().orderstatus != OrderStatus.COMPLETED)
        ) {
          const whatsappUser = await this.whatsappUserRepository.findOneByPhone(orderRequest.getPropsCopy().user_phone || '');
          return { whatsappUser, orderRequest };
        }
        return null;
      })
    ).then(results => results.filter(result => result !== null));
  }

  @UseGuards(JwtAuthGuard())
  @Get('history/:type')
  @ApiOperation({ summary: 'Get my order history' })
  async getMyOrderHistoryByType(@IAM() user: UserOrmEntity, @Param('type') type: OrderType) {
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(user.id), orderType: type})
    orderRequests.sort((a, b) => new Date(b.createdAt.value).getTime() - new Date(a.createdAt.value).getTime());

    return Promise.all(
      orderRequests.map(async orderRequest => {
        if (
          orderRequest &&
          (orderRequest.getPropsCopy().orderstatus != OrderStatus.REJECTED ||
            orderRequest.getPropsCopy().orderstatus != OrderStatus.COMPLETED)
        ) {
          const whatsappUser = await this.whatsappUserRepository.findOneByPhone(orderRequest.getPropsCopy().user_phone || '');
          return { whatsappUser, orderRequest };
        }
        return null;
      })
    ).then(results => results.filter(result => result !== null));
  }

  @Get('cancel/:session')
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrderRequest(@Param('session') sessionId: string) {
    return this.cancelOrderService.handle(sessionId)
  }

  @Post('reject/:orderId')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Cancel order by order id' })
  async cancelOrderRequestByOrderId(@Param('orderId') orderId: string) {
    return this.rejectOrderService.handle(orderId)
  }

  @Get('user/:session')
  @ApiOperation({ summary: 'Get user by session id' })
  async getUserBySessionId(@Param('session') session: string) {
    const user = await this.whatsappUserRepository.findOneBySession(session)

    return user?.getPropsCopy()
  }

  @UseGuards(JwtAuthGuard())
  @Post('accept')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'Accept order' })
  async handleOrderAccepted(@Body() input: ChangeOrderStatus) {
    await this.acceptOrderService.handle(input);
  }

  @UseGuards(JwtAuthGuard())
  @Post('driver-arrived')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'Driver arriver to take up place' })
  async handleDriverArrived(@Body() input: ChangeOrderStatus) {
    await this.driverArrivedService.handle(input);

  }

  @UseGuards(JwtAuthGuard())
  @Post('start')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'start' })
  async handleOrderStarted(@Body() input: ChangeOrderStatus) {
    await this.startOrderService.handle(input);
  }

  @UseGuards(JwtAuthGuard())
  @Post('end')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'End Ride' })
  async handleRideEnded(@Body() input: ChangeOrderStatus) {
    await this.completeOrderService.handle(input);
  }
}
