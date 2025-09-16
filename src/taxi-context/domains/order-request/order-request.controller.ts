import { BadRequestException, Body, Controller, Get, Logger, NotFoundException, Param, Post, Put, Query, UseGuards, ConflictException } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
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
  @Post('/recurring/callback')
  async recurrentProfileCallback(@Body() dto: ReccuringProfileCallbackDto) {
    const recurringProfileId = dto.pg_recurring_profile_id;
    const orderId = dto.pg_order_id;

    Logger.log(dto)
    console.log(dto)
    // Публикуем событие в PubSub

    const key = `recurring:${orderId}`;

    await this.cacheStorageService.setValue(key, { recurringProfileId });

    return { status: 'ok' };
  }

  @Get('/recurring/:orderId')
  async getRecurringProfileId(@Param('orderId') orderId: string) {
    const key = `recurring:${orderId}`;
    const data = await this.cacheStorageService.getValue(key);

    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    if (!parsed?.recurringProfileId) {
      throw new NotFoundException('Recurring profile ID not found');
    }

    return { recurringProfileId: parsed.recurringProfileId };
  }

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
      const order = await this.orderRequestRepository.findOneById(orderId)

      if(order && order.getPropsCopy().driverId?.value == user.id){
        const location = await this.cacheStorageService.getDriverLocation(user.id)

        const clientSocketId = await this.cacheStorageService.getSocketClientId(orderId);
        if (clientSocketId && !location)
          this.orderRequestGateway.server.to(clientSocketId).emit('newOrder');
      }
    }
  }

  @Get('client-active-order')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get order status' })
  @ApiResponse({ status: 200, description: 'Order status retrieved successfully', type: OrderStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderStatus(@IAM() user: UserOrmEntity) {
    // console.log(user.firstName + ' ' + user.lastName)
    const orderRequest = await this.orderRequestRepository.findActiveByClientId(user.id)
    if(!orderRequest){
      throw new NotFoundException('Order not found');
    }

    const { orderStatus, rating } = orderRequest.getPropsCopy()
    console.log(orderStatus)
    if(orderRequest){
      const driverId = orderRequest.getPropsCopy().driverId?.value

      const driver = driverId ? await this.userRepository.findOneById(driverId) : undefined;

      const orderRequests = await OrderRequestOrmEntity.query().whereNotNull('rating')

      const category = driverId ? await this.categoryLicenseRepository.findOneByDriverId(driverId, orderRequest.getPropsCopy().orderType) : undefined


      const location = await this.cacheStorageService.getDriverLocation(driverId || '');

      return new OrderStatusResponseDto(
        orderRequest,
        driver,
        category,
        location,
        orderRequests.length
      );
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

  @Post('category/register')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Register for category' })
  @ApiBody({ type: CategoryRegisterRequest })
  @ApiResponse({ status: 201, description: 'Category registered successfully' })
  @ApiResponse({ status: 409, description: 'Already registered to this category' })
  async categoryRegister(@Body() input: CategoryRegisterRequest, @IAM() user: UserOrmEntity) {
    const {governmentNumber, model, SSN, type, color, brand} = input

    const isExists = await this.categoryLicenseRepository.findMany({driverId: new UUID(user.id), categoryType: type})

    if(isExists.length > 0){
      throw new ConflictException("You already registered to this category")
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
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found or does not belong to you' })
  async categoryEdit(@Param('id') id: string, @Body() input: CategoryRegisterRequest, @IAM() user: UserOrmEntity) {
    const {governmentNumber, model, SSN, type, color, brand} = input

    const isExists = await this.categoryLicenseRepository.findMany({driverId: new UUID(user.id), id: new UUID(id)})

    if(isExists.length === 0)
      throw new NotFoundException("Category not found or doesn't belong to you")

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
  @ApiResponse({ status: 200, description: 'Category licenses retrieved successfully', type: [CategoryLicenseResponseDto] })
  async categoryInfo(@IAM() user: UserOrmEntity) {
    const categoryLicenses = await this.categoryLicenseRepository.findAllByDriverId(user.id);
    return categoryLicenses.map(categoryLicense => new CategoryLicenseResponseDto(categoryLicense));
  }

  @Post('create-order')
  @ApiOperation({ summary: 'Creating order request' })
  @ApiBody({ type: CreateOrderRequest })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @UseGuards(JwtAuthGuard())
  async createOrder(@Body() input: CreateOrderRequest, @IAM() user: UserOrmEntity) {
    return this.createOrderService.handle(input, user)
  }


  @UseGuards(JwtAuthGuard())
  @Get('active/:type')
  @ApiOperation({ summary: 'Get active orders by type' })
  @ApiResponse({ status: 200, description: 'Active orders retrieved successfully' })
  async getActiveOrdersByType(@Param('type') type: OrderType, @IAM() user: UserOrmEntity) {
    const driverLocation = await this.cacheStorageService.getDriverLocation(user.id);
    if (!driverLocation) {
      return []
      // throw new Error('Driver location not found');
    }


    const nearbyOrders = await this.cacheStorageService.findNearestOrdersByType(driverLocation.longitude, driverLocation.latitude, type);
    // const nearbyOrders = await this.cacheStorageService.findAllOrders(type);
    const orderRequests = await Promise.all(
      nearbyOrders.map(async orderId => {
        const orderRequest = await this.orderRequestRepository.findOneById(orderId);
        if(orderRequest && orderRequest.getPropsCopy().clientId.value != user.id && orderRequest.getPropsCopy().orderStatus == OrderStatus.CREATED)
          return orderRequest
      })
    );

    const validOrderRequests = orderRequests.filter(orderRequest => orderRequest != null);

    validOrderRequests.sort((a, b) => new Date(b!.createdAt.value).getTime() - new Date(a!.createdAt.value).getTime());

    validOrderRequests.forEach(orderRequest => {
      const orderLocation = orderRequest!.getPropsCopy();

      if (orderLocation.lat !== undefined && orderLocation.lng !== undefined) {
        const distance = this.calculateDistance(driverLocation.latitude, driverLocation.longitude, orderLocation.lat, orderLocation.lng);
        // console.log(`Расстояние до заказа ${orderRequest!.id.value}: ${distance.toFixed(2)} км`);
      } else {
        // console.log(`Координаты для заказа ${orderRequest!.id.value} не определены.`);
      }
    });

    return await Promise.all(validOrderRequests.map(async orderRequest => {
      const orderUser = await this.userRepository.findOneById(orderRequest!.getPropsCopy().clientId.value);
      return {
        user: orderUser ? new UserResponseDto(orderUser) : undefined,
        orderRequest: new OrderRequestResponseDto(orderRequest!)
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
  @ApiResponse({ status: 200, description: 'Active order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getMyActiveOrder(@IAM() user?: UserOrmEntity) {
    const orderRequest = await this.orderRequestRepository.findActiveByDriverId(user.id);

    if (orderRequest) {
      // Возвращаем данные в формате ActiveRequestModel для фронтенда
      return {
        whatsappUser: orderRequest.client ? new UserResponseDto(orderRequest.client) : undefined,
        driver: undefined,
        orderRequest: new OrderRequestResponseDto(orderRequest)
      };
    }

    throw new NotFoundException('Order not found');
  }

  @UseGuards(JwtAuthGuard())
  @Get('history/:type')
  @ApiOperation({ summary: 'Get my order history' })
  @ApiResponse({ status: 200, description: 'Order history retrieved successfully', type: [OrderRequestResponseDto] })
  async getMyOrderHistoryByType(@IAM() user: UserOrmEntity, @Param('type') type: OrderType) {
    // Используем метод репозитория для получения истории заказов водителя
    const orderRequests = await this.orderRequestRepository.findHistoryByDriverId(user.id, type);

    return orderRequests.map((orderRequest) => {
      const props = orderRequest.getPropsCopy();
      return {
        whatsappUser: orderRequest.client ? new UserResponseDto(orderRequest.client) : undefined,
        driver: undefined,
        orderRequest: {
          id: orderRequest.id.value,
          driverId: props.driverId?.value,
          clientId: props.clientId.value,
          orderType: props.orderType,
          from: props.from,
          to: props.to,
          startTime: props.startTime,
          arrivalTime: props.arrivalTime,
          lat: props.lat,
          lng: props.lng,
          price: props.price,
          comment: props.comment,
          createdAt: props.createdAt,
          updatedAt: props.updatedAt,
          deletedAt: undefined,
          rating: props.rating,
          orderStatus: props.orderStatus,
          fromMapboxId: props.fromMapboxId,
          toMapboxId: props.toMapboxId,
        }
      };
    });
  }

  @UseGuards(JwtAuthGuard())
  @Get('client-history/:type')
  @ApiOperation({ summary: 'Get my order history' })
  @ApiResponse({ status: 200, description: 'Client order history retrieved successfully', type: [OrderRequestResponseDto] })
  async getCilentOrderHistoryByType(@IAM() user: UserOrmEntity, @Param('type') type: OrderType) {
    // Используем метод репозитория для получения истории заказов клиента
    const orderRequests = await this.orderRequestRepository.findHistoryByClientId(user.id, type);

    return orderRequests.map((orderRequest) => {
      const props = orderRequest.getPropsCopy();
      return {
        whatsappUser: undefined,
        driver: orderRequest.driver ? new UserResponseDto(orderRequest.driver) : undefined,
        orderRequest: {
          id: orderRequest.id.value,
          driverId: props.driverId?.value,
          clientId: props.clientId.value,
          orderType: props.orderType,
          from: props.from,
          to: props.to,
          startTime: props.startTime,
          arrivalTime: props.arrivalTime,
          lat: props.lat,
          lng: props.lng,
          price: props.price,
          comment: props.comment,
          createdAt: props.createdAt,
          updatedAt: props.updatedAt,
          deletedAt: undefined,
          rating: props.rating,
          orderStatus: props.orderStatus,
          fromMapboxId: props.fromMapboxId,
          toMapboxId: props.toMapboxId,
        }
      };
    });
  }

  @Post('cancel/:orderId')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrderRequest(@Param('orderId') orderId: string, @IAM() user: UserOrmEntity) {
    return this.cancelOrderService.handle(orderId, user)
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

  @UseGuards(JwtAuthGuard())
  @Post('accept')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'Accept order' })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  async handleOrderAccepted(@Body() input: ChangeOrderStatus, @IAM() user: UserOrmEntity) {
    await this.acceptOrderService.handle(input, user);
  }

  @UseGuards(JwtAuthGuard())
  @Post('driver-arrived')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'Driver arriver to take up place' })
  @ApiResponse({ status: 200, description: 'Driver arrived status updated successfully' })
  async handleDriverArrived(@Body() input: ChangeOrderStatus) {
    await this.driverArrivedService.handle(input);

  }

  @UseGuards(JwtAuthGuard())
  @Post('start')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'start' })
  @ApiResponse({ status: 200, description: 'Order started successfully' })
  async handleOrderStarted(@Body() input: ChangeOrderStatus, @IAM() user: UserOrmEntity) {
    await this.startOrderService.handle(input, user);
  }

  @UseGuards(JwtAuthGuard())
  @Post('end')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'End Ride' })
  @ApiResponse({ status: 200, description: 'Ride ended successfully' })
  async handleRideEnded(@Body() input: ChangeOrderStatus) {
    await this.completeOrderService.handle(input);
  }


  @Get('address')
  @ApiOperation({ summary: 'Get address by coordinates' })
  @ApiResponse({ status: 200, description: 'Address retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid coordinates' })
  async getAddress(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('radius') radiusStr?: string,
  ) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const radius = radiusStr ? parseFloat(radiusStr) : 15;

    if (isNaN(lat) || isNaN(lon)) {
      throw new BadRequestException('Invalid lat/lon query params');
    }

    // 1️⃣ Запрос в **2ГИС API** для определения ближайшего адреса
    const response = await fetch(`https://platform.2gis.ru/api/services/geocoder?type=street%2Cbuilding%2Cattraction%2Cstation_platform%2Cadm_div.place%2Cadm_div.city%2Cadm_div.district&fields=items.point%2Citems.region_id%2Citems.segment_id&lon=${lon}&lat=${lat}`, {
      method: 'GET',
      headers: { 'User-Agent': 'MyApp/1.0' }
    });

    if (!response.ok) {
      throw new BadRequestException(`2ГИС API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 2️⃣ Проверяем, есть ли результаты
    if (!data?.result?.items || data.result.items.length === 0) {
      return { message: 'Адрес не найден' };
    }

    // 3️⃣ Выбираем **лучший** результат
    const bestMatch = data.result.items[0];

    return bestMatch.full_name || bestMatch.name
  }

  @Get('find-by-name')
  @ApiOperation({ summary: 'Search places by name' })
  @ApiResponse({ status: 200, description: 'Places found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async localSearch(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('search') search: string,
  ) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon) || !search) {
      throw new BadRequestException('Invalid params: lat, lon, query are required');
    }

    // 1️⃣ Вычисляем bounding box на 25км
    const bbox = this.makeBoundingBox(lat, lon, 25);

    // 2️⃣ Формируем URL запроса к 2ГИС API
    const url = new URL('https://platform.2gis.ru/api/services/geocoder');
    url.searchParams.set('fields', 'items.point,items.region_id,items.segment_id');
    url.searchParams.set('q', search);
    url.searchParams.set('point1', `${bbox.left},${bbox.top}`);
    url.searchParams.set('point2', `${bbox.right},${bbox.bottom}`);

    // 3️⃣ Делаем запрос
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'User-Agent': 'MyApp/1.0' }
    });

    if (!response.ok) {
      throw new BadRequestException(`2ГИС API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 4️⃣ Проверяем, есть ли результаты
    if (!data?.result?.items || data.result.items.length === 0) {
      return { message: 'Объект не найден' };
    }
    const responsee = data.result.items.map((item: any) => ({
      "name": `${item.full_name || item.name || 'Неизвестный адрес'}`,
      "lat": `${item.point.lat}` ,
      "lon": `${item.point.lon}`
    }));
    console.log(responsee)

    // 5️⃣ Возвращаем список объектов
    return responsee
  }

  /**
   * Создаёт прямоугольную область (bounding box) вокруг (lat, lon)
   * с радиусом `radiusKm` (в км) по широте и долготе.
   *
   * Возвращает { top, bottom, left, right }:
   *  - top > bottom
   *  - left < right
   *  Пример: 25км = ~0.225 градусов по широте (1° ~ 111км)
   */
  private makeBoundingBox(lat: number, lon: number, radiusKm: number) {
    // Примерное количество километров в одном градусе широты
    const degPerKmLat = 1 / 111;
    // Для долготы зависит от широты (чем дальше от экватора, тем меньше 1°)
    const degPerKmLon = 1 / (111 * Math.cos(lat * Math.PI / 180));

    const latDelta = radiusKm * degPerKmLat;
    const lonDelta = radiusKm * degPerKmLon;

    const top = lat + latDelta;
    const bottom = lat - latDelta;
    const left = lon - lonDelta;
    const right = lon + lonDelta;

    return { top, bottom, left, right };
  }
}
