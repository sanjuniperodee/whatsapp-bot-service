import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
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
  @Post('/location/update')
  @UseGuards(JwtAuthGuard())
  async handleLocationUpdate(
    @Body() input: UpdateLocationRequest,
    @IAM() user: UserOrmEntity
  ) {
    const { lng, lat, orderId } = input;

    const order = await this.orderRequestRepository.findOneById(orderId)

    const location = await this.cacheStorageService.getDriverLocation(order?.getPropsCopy().driverId?.value || '')

    await this.cacheStorageService.updateDriverLocation(order?.getPropsCopy().driverId?.value || '', lng, lat);

    const clientSocketId = await this.cacheStorageService.getSocketClientId(orderId);
    if (clientSocketId && !location)
      this.orderRequestGateway.server.to(clientSocketId).emit('newOrder');

  }

  @Get('client-active-order')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get order status' })
  async getOrderStatus(@IAM() user: UserOrmEntity) {
    console.log(user.firstName + ' ' + user.lastName)
    const orderRequests = await this.orderRequestRepository.findMany({ clientId: new UUID(user?.id || '')})
    for (const orderRequest of orderRequests)
      if(orderRequest && (orderRequest.getPropsCopy().orderStatus != OrderStatus.REJECTED && ((orderRequest.getPropsCopy().orderStatus == OrderStatus.COMPLETED && !orderRequest.getPropsCopy().rating) || orderRequest.getPropsCopy().orderStatus != OrderStatus.COMPLETED))){
        const driverId = orderRequest.getPropsCopy().driverId?.value

        const driver = driverId ? await this.userRepository.findOneById(driverId) : undefined;

        const orderRequests = await OrderRequestOrmEntity.query().whereNotNull('rating')

        const category = driverId ? await this.categoryLicenseRepository.findOneByDriverId(driverId, orderRequest.getPropsCopy().orderType) : undefined


        const location = await this.cacheStorageService.getDriverLocation(driverId || '');
        console.log(orderRequest.getPropsCopy())

        return {
          order: orderRequest.getPropsCopy(),
          driver: { ...driver?.getPropsCopy(), location },
          car: category,
          status: orderRequest.getPropsCopy().orderStatus,
          reviews: orderRequests.length
        }
      }
    console.log('12312321321312312')
    return 'You dont have active order'
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

    orderRequest?.rate(rating, comment)

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

  @Put('category/:id')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Edit for category' })
  @ApiBody({ type: CategoryRegisterRequest })
  async categoryEdit(@Param('id') id: string, @Body() input: CategoryRegisterRequest, @IAM() user: UserOrmEntity) {
    const {governmentNumber, model, SSN, type, color, brand} = input

    const isExists = await this.categoryLicenseRepository.findMany({driverId: new UUID(user.id), categoryType: type, id: new UUID(id)})

    if(!isExists.length)
      throw new Error("You already registered to this category")

    await CategoryLicenseOrmEntity.query().updateAndFetchById(id, {
      SSN: SSN,
      brand: brand,
      categoryType: type,
      color: color,
      model: model,
      number: governmentNumber
    })
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
  @UseGuards(JwtAuthGuard())
  async createOrder(@Body() input: CreateOrderRequest, @IAM() user: UserOrmEntity) {
    return this.createOrderService.handle(input, user)
  }


  @UseGuards(JwtAuthGuard())
  @Get('active/:type')
  @ApiOperation({ summary: 'Get active orders by type' })
  async getActiveOrdersByType(@Param('type') type: OrderType, @IAM() user: UserOrmEntity) {
    const driverLocation = await this.cacheStorageService.getDriverLocation(user.id);
    if (!driverLocation) {
      throw new Error('Driver location not found');
    }


    const nearbyOrders = await this.cacheStorageService.findNearestOrdersByType(driverLocation.longitude, driverLocation.latitude, type);
    // const nearbyOrders = await this.cacheStorageService.findAllOrders(type);
    const orderRequests = await Promise.all(
      nearbyOrders.map(async orderId => {
        const orderRequest = await this.orderRequestRepository.findOneById(orderId);
        return orderRequest || null;
      })
    );

    const validOrderRequests = orderRequests.filter(orderRequest => orderRequest !== null);

    validOrderRequests.sort((a, b) => new Date(b!.createdAt.value).getTime() - new Date(a!.createdAt.value).getTime());

    validOrderRequests.forEach(orderRequest => {
      const orderLocation = orderRequest!.getPropsCopy();

      if (orderLocation.lat !== undefined && orderLocation.lng !== undefined) {
        const distance = this.calculateDistance(driverLocation.latitude, driverLocation.longitude, orderLocation.lat, orderLocation.lng);
        console.log(`Расстояние до заказа ${orderRequest!.id.value}: ${distance.toFixed(2)} км`);
      } else {
        console.log(`Координаты для заказа ${orderRequest!.id.value} не определены.`);
      }
    });

    return await Promise.all(validOrderRequests.map(async orderRequest => {
      const orderUser = await this.userRepository.findOneById(orderRequest!.getPropsCopy().clientId.value);
      return {
        user: orderUser,
        orderRequest: orderRequest
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
      if(orderRequest && (orderRequest.getPropsCopy().orderStatus != OrderStatus.REJECTED && orderRequest.getPropsCopy().orderStatus != OrderStatus.COMPLETED)){
        const whatsappUser = await this.userRepository.findOneById(orderRequest.getPropsCopy().clientId.value);
        return { whatsappUser, orderRequest }
      }

    return 'You dont have active order'
  }

  @UseGuards(JwtAuthGuard())
  @Get('history/:type')
  @ApiOperation({ summary: 'Get my order history' })
  async getMyOrderHistoryByType(@IAM() user: UserOrmEntity, @Param('type') type: OrderType) {
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(user.id), orderType: type, orderStatus: OrderStatus.COMPLETED})
    orderRequests.sort((a, b) => new Date(b.createdAt.value).getTime() - new Date(a.createdAt.value).getTime());

    return Promise.all(
      orderRequests.map(async orderRequest => {
        if (orderRequest) {
          const whatsappUser = await this.userRepository.findOneById(orderRequest.getPropsCopy().clientId.value);
          return { whatsappUser, orderRequest };
        }
        return null;
      })
    ).then(results => results.filter(result => result !== null));
  }

  @UseGuards(JwtAuthGuard())
  @Get('client-history/:type')
  @ApiOperation({ summary: 'Get my order history' })
  async getCilentOrderHistoryByType(@IAM() user: UserOrmEntity, @Param('type') type: OrderType) {
    const orderRequests = await this.orderRequestRepository.findMany({ clientId: new UUID(user.id), orderType: type, orderStatus: OrderStatus.COMPLETED})
    orderRequests.sort((a, b) => new Date(b.createdAt.value).getTime() - new Date(a.createdAt.value).getTime());

    return Promise.all(
      orderRequests.map(async orderRequest => {
        const driverId = orderRequest.getPropsCopy().driverId
        if (orderRequest && driverId) {
          const driver = await this.userRepository.findOneById(driverId.value);
          return { driver, orderRequest };
        }
        return null;
      })
    ).then(results => results.filter(result => result !== null));
  }

  @Post('cancel/:orderId')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrderRequest(@Param('orderId') orderId: string, @IAM() user: UserOrmEntity) {
    return this.cancelOrderService.handle(orderId, user)
  }

  @Post('reject/:orderId')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Cancel order by order id' })
  async cancelOrderRequestByOrderId(@Param('orderId') orderId: string) {
    return this.rejectOrderService.handle(orderId)
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get user by session id' })
  async getUserBySessionId(@Param('id') id: string) {
    const user = await this.userRepository.findOneById(id)

    return user?.getPropsCopy()
  }

  @UseGuards(JwtAuthGuard())
  @Post('accept')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'Accept order' })
  async handleOrderAccepted(@Body() input: ChangeOrderStatus, @IAM() user: UserOrmEntity) {
    await this.acceptOrderService.handle(input, user);
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
  async handleOrderStarted(@Body() input: ChangeOrderStatus, @IAM() user: UserOrmEntity) {
    await this.startOrderService.handle(input, user);
  }

  @UseGuards(JwtAuthGuard())
  @Post('end')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'End Ride' })
  async handleRideEnded(@Body() input: ChangeOrderStatus) {
    await this.completeOrderService.handle(input);
  }
}
