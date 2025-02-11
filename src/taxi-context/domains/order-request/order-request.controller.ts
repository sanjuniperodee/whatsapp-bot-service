import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
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
import * as stringSimilarity from 'string-similarity';

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

  @Post('log')
  async log(@Body() input: any){
    console.log(input)
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
  async getOrderStatus(@IAM() user: UserOrmEntity) {
    // console.log(user.firstName + ' ' + user.lastName)
    const orderRequest = await this.orderRequestRepository.findActiveByClientId(user.id)
    if(!orderRequest){
      return 'You dont have active order'
    }

    const { orderStatus, rating } = orderRequest.getPropsCopy()
    console.log(orderStatus)
    if(orderRequest){
      const driverId = orderRequest.getPropsCopy().driverId?.value

      const driver = driverId ? await this.userRepository.findOneById(driverId) : undefined;

      const orderRequests = await OrderRequestOrmEntity.query().whereNotNull('rating')

      const category = driverId ? await this.categoryLicenseRepository.findOneByDriverId(driverId, orderRequest.getPropsCopy().orderType) : undefined


      const location = await this.cacheStorageService.getDriverLocation(driverId || '');

      return {
        order: orderRequest.getPropsCopy(),
        driver: { ...driver?.getPropsCopy(), location },
        car: category,
        status: orderRequest.getPropsCopy().orderStatus,
        reviews: orderRequests.length
      }
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
    {
      const { orderStatus } = orderRequest.getPropsCopy()
      if(orderRequest && (orderStatus != OrderStatus.REJECTED && orderStatus != OrderStatus.COMPLETED && orderStatus != OrderStatus.REJECTED_BY_CLIENT)){
        const whatsappUser = await this.userRepository.findOneById(orderRequest.getPropsCopy().clientId.value);
        return { whatsappUser, orderRequest }
      }
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


  @Get('address')
  async getAddress(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
  ) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) {
      throw new Error('Invalid lat/lon query params');
    }

    // По умолчанию 80, если не указано radius
    const radius = 80

    // 1) Делаем запрос к Overpass
    const data = await this.fetchOverpassAll(lat, lon, radius);

    // 2) Ищем отдельно дом (до 60 м), регион (ближайший)
    const elements = data.elements || [];

    const houseObj = this.findHouseUnder60(elements, lat, lon);
    const regionObj = this.findNearestRegion(elements, lat, lon);
    console.log(regionObj)

    return  `${regionObj?.regionName} ${houseObj?.houseNumber}`
  }

  // -----------------------------------------
  //  fetchOverpassAll: Аналогичный запрос
  // -----------------------------------------
  private async fetchOverpassAll(lat: number, lon: number, radius: number) {
    const query = `
[out:json];
(
  node["addr:housenumber"](around:${radius},${lat},${lon});
  way["addr:housenumber"](around:${radius},${lat},${lon});
  relation["addr:housenumber"](around:${radius},${lat},${lon});

  node["place"](around:${radius},${lat},${lon});
  way["place"](around:${radius},${lat},${lon});
  relation["place"](around:${radius},${lat},${lon});

  relation["boundary"="administrative"](around:${radius},${lat},${lon});
);
out center;
    `.trim();

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
      body: query
    });

    if (!response.ok) {
      throw new Error('Overpass error: ' + response.statusText);
    }

    const json = await response.json();
    return json;
  }

  // -----------------------------------------
  //  findHouseUnder60
  // -----------------------------------------
  private findHouseUnder60(elements: any[], clickLat: number, clickLon: number) {
    let closestHouse: any = null;
    let minDist = Infinity;

    for (const el of elements) {
      if (!el.tags) continue;
      const houseNum = el.tags['addr:housenumber'];
      if (!houseNum) continue;

      const coords = this.getCoords(el);
      if (!coords) continue;

      const dist = this.haversineDist(clickLat, clickLon, coords.lat, coords.lon);
      if (dist < minDist) {
        minDist = dist;
        closestHouse = el;
      }
    }
    console.log(minDist)
    if (!closestHouse) return null;

    return {
      houseNumber: closestHouse.tags['addr:housenumber'],
      distance: minDist
    };
  }

  // -----------------------------------------
  //  findNearestRegion
  // -----------------------------------------
  private findNearestRegion(elements: any[], clickLat: number, clickLon: number) {
    const candidateKeys = [
      'addr:street',
      'addr:place',
      'addr:neighbourhood',
      'shop',
      'microdistrict',
      'city_microdistrict',
      'place',  // place=suburb/neighbourhood/...
      'name'
    ];

    let closest: any = null;
    let minDist = Infinity;

    for (const el of elements) {
      if (!el.tags) continue;

      // Есть ли хотя бы один ключ из candidateKeys
      const hasAnyKey = candidateKeys.some(key => el.tags[key]);
      if (!hasAnyKey) continue;

      const coords = this.getCoords(el);
      if (!coords) continue;

      const dist = this.haversineDist(clickLat, clickLon, coords.lat, coords.lon);
      if (dist < minDist) {
        minDist = dist;
        closest = el;
      }
    }

    if (!closest) return null;

    // fallback для имени
    const t = closest.tags;
    console.log(t)
    const nameKeysFallback = [
      'name',
      'addr:street',
      'addr:place',
      'addr:neighbourhood',
      'shop',
      'microdistrict',
      'city_microdistrict',
    ];
    let finalName = 'Без названия';
    for (const key of nameKeysFallback) {
      console.log(key)
      if (t[key]) {
        console.log(t[key])
        finalName = t[key];
        break;
      }
    }

    return {
      regionName: finalName,
      distance: minDist
    };
  }

  // -----------------------------------------
  //  getCoords: node/way/relation => lat/lon
  // -----------------------------------------
  private getCoords(el: any) {
    if (el.type === 'node') {
      return { lat: el.lat, lon: el.lon };
    } else if (el.center) {
      return { lat: el.center.lat, lon: el.center.lon };
    }
    return null;
  }

  // -----------------------------------------
  //  haversineDist
  // -----------------------------------------
  private haversineDist(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000; // метры
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2)*Math.sin(dLat/2) +
      Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
      Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  @Get('find-by-name')
  async localSearch(
    @Query('lat') latStr: string,
    @Query('lon') lonStr: string,
    @Query('search') search: string,
  ) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon) || !search) {
      throw new Error('Invalid params: lat, lon, query are required');
    }

    // Вычисляем bounding box на 25км (по умолчанию)
    const bbox = this.makeBoundingBox(lat, lon, 25);

    // Формируем URL запроса к Nominatim
    // Важно: viewbox = left, top, right, bottom
    //        bounded=1 => искать только внутри bounding box
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '10');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('q', search);

    // Порядок: left, top, right, bottom
    // bbox = { top, bottom, left, right }
    url.searchParams.set('viewbox',
      `${bbox.left},${bbox.top},${bbox.right},${bbox.bottom}`
    );
    url.searchParams.set('bounded', '1');  // ограничить результаты bbox

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        // Nominatim просит указать User-Agent с контактами
        'User-Agent': 'MyApp/1.0 (mailto:my_email@example.com)'
      }
    });
    if (!response.ok) {
      throw new Error(`Nominatim search error: ${response.status} ${response.statusText}`);
    }

    const results = await response.json();
    return results.map((el: { lat: number; lon: number; name: string }) => ({
      lat: el.lat,
      lon: el.lon,
      name: el.name
    })); // массив объектов [ { display_name, lat, lon, ... }, ... ]
  }

  /**
   * Создаём прямоугольную область (bounding box) вокруг (lat, lon)
   * с радиусом `radiusKm` (в км) по широте и долготе.
   *
   * Возвращаем { top, bottom, left, right }:
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
