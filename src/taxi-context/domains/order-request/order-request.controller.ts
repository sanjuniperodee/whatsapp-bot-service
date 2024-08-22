import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { CreateOrderRequest } from '@domain/order-request/services/create-order/create-order-request';
import { SMSCodeRecord } from '@domain/user/types';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { NotFoundError } from 'rxjs';
import { OrderStatus } from '@infrastructure/enums';
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

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('v1/order-requests')
export class OrderRequestController {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userRepository: UserRepository,
    private readonly whatsAppService: WhatsAppService,
    private readonly whatsappUserRepository: WhatsappUserRepository,
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

  @Get('status/:session')
  @ApiOperation({ summary: 'Get order status' })
  async getOrderStatus(@Param('session') session: string) {
    const orderRequest = await this.orderRequestRepository.findOne({ sessionid: session });
    if (!orderRequest) {
      throw new Error('Session is expired!');
    }

    const driverId = orderRequest.getPropsCopy().driverId?.value

    const driver = driverId ? await this.userRepository.findOneById(driverId) : undefined;

    const orderRequests = await OrderRequestOrmEntity.query().whereNotNull('rating')

    return {
      order: orderRequest.getPropsCopy(),
      driver: driver?.getPropsCopy(),
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

  @Post('create-order')
  @ApiOperation({ summary: 'Creating order request' })
  @ApiBody({ type: CreateOrderRequest })
  async createOrder(@Body() input: CreateOrderRequest) {
    const { phone, orderType, from, to, lat, lng, price, comment} = input;

    const session = await this.getSMScode(phone);

    if (!session?.smsCode) {
      throw new NotFoundError("Session is not found");
    }

    if (await this.orderRequestRepository.findOne({ sessionid: session.smsCode })) {
      throw new Error('Order request with this session already exists');
    }

    const orderRequest = OrderRequestEntity.create({
      orderType,
      orderstatus: OrderStatus.CREATED,
      from,
      to,
      lat,
      lng,
      price,
      comment: comment,
      sessionid: session.smsCode,
      user_phone: phone
    });

    const user = await this.whatsappUserRepository.findOneByPhone(phone)

    await this.orderRequestRepository.save(orderRequest);
    await this.orderRequestGateway.handleOrderCreated(orderRequest);

    return orderRequest.getPropsCopy();
  }


  @UseGuards(JwtAuthGuard())
  @Get('active-orders')
  @ApiOperation({ summary: 'Get active orders' })
  async getActiveOrders() {
    const orderRequests = await this.orderRequestRepository.findMany({ orderstatus: OrderStatus.CREATED })

    return await Promise.all(orderRequests.map(async orderRequest => {
      const user = await this.whatsappUserRepository.findOneByPhone(orderRequest.getPropsCopy().user_phone || '');
      return {
        user,
        orderRequest
      }
    }))
  }

  @UseGuards(JwtAuthGuard())
  @Get('my-active-order')
  @ApiOperation({ summary: 'Get my current order' })
  async getMyActiveOrder(@IAM() user: UserOrmEntity) {
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(user.id)})

    for (const orderRequest of orderRequests)
      if(orderRequest && (orderRequest.getPropsCopy().orderstatus != OrderStatus.REJECTED && orderRequest.getPropsCopy().orderstatus != OrderStatus.COMPLETED)){
        const whatsappUser = await this.whatsappUserRepository.findOneByPhone(orderRequest.getPropsCopy().user_phone || '');
        return { whatsappUser, orderRequest }
      }

    return 'You dont have active order'
  }

  @UseGuards(JwtAuthGuard())
  @Get('history')
  @ApiOperation({ summary: 'Get my order history' })
  async getMyOrderHistory(@IAM() user: UserOrmEntity) {
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(user.id)})

    return Promise.all(
      orderRequests.map(async orderRequest => {
        if (
          orderRequest &&
          orderRequest.getPropsCopy().orderstatus != OrderStatus.REJECTED &&
          orderRequest.getPropsCopy().orderstatus != OrderStatus.COMPLETED
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
  async cancelOrderRequest(@Param('session') session: string) {
    const orderRequest = await this.orderRequestRepository.findOne({ sessionid: session });
    if (!orderRequest) {
      throw new Error('Session is expired');
    }

    const flag = await this.getSMScode(orderRequest.getPropsCopy().user_phone || '');
    if (!flag || flag.smsCode !== session) {
      throw new Error('Session is expired');
    }

    orderRequest.reject('');
    await this.orderRequestRepository.save(orderRequest);

    return orderRequest.getPropsCopy();
  }

  @Get('user/:session')
  @ApiOperation({ summary: 'Get user by session id' })
  async getUserBySessionId(@Param('session') session: string) {
    const user = await this.whatsappUserRepository.findOneBySession(session)

    return user?.getPropsCopy()
  }

  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }

  @UseGuards(JwtAuthGuard())
  @Post('accept')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'Accept order' })
  async handleOrderAccepted(@Body() input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const orderRequests = await this.orderRequestRepository.findMany({ driverId: new UUID(driverId)})

    for (const orderRequest of orderRequests)
      if(orderRequest && (orderRequest.getPropsCopy().orderstatus != OrderStatus.REJECTED && orderRequest.getPropsCopy().orderstatus != OrderStatus.COMPLETED))
        return 'You already have active order'

    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order) {
      order.accept(new UUID(driverId));
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      console.log(userPhone, driver)
      if (userPhone && driver) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель принял ваш заказ, приедет золотой кабан')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          await this.orderRequestGateway.emitEvent(clientSocketId, 'orderAccepted', order, driver)
        }
      }
    }
  }

  @UseGuards(JwtAuthGuard())
  @Post('driver-arrived')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'Driver arriver to take up place' })
  async handleDriverArrived(@Body() input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId) {
      order.driverArrived();
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone && driver) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель приехал, вас ожидает золотой кабан')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          await this.orderRequestGateway.emitEvent(clientSocketId, 'driverArrived', order, driver)
        }
      }
    }
  }

  @UseGuards(JwtAuthGuard())
  @Post('start')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'start' })
  async handleOrderStarted(@Body() input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId) {
      order.start();
      await this.orderRequestRepository.save(order);

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone && driver) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Водитель начал заказ')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          await this.orderRequestGateway.emitEvent(clientSocketId, 'rideStarted', order, driver)
        }
      }
    }
  }

  @UseGuards(JwtAuthGuard())
  @Post('end')
  @ApiBody({ type: ChangeOrderStatus })
  @ApiOperation({ summary: 'End Ride' })
  async handleRideEnded(@Body() input: ChangeOrderStatus) {
    const { driverId, orderId } = input;
    const order = await this.orderRequestRepository.findOneById(orderId);

    if (order && order.getPropsCopy().driverId?.value == driverId) {
      order.rideEnded();
      await this.orderRequestRepository.save(order);

      const session = await this.getSMScode(order.getPropsCopy().user_phone || '')
      if(session?.smsCode == order.getPropsCopy().sessionid)
        await this.cacheStorageService.deleteValue(order.getPropsCopy().user_phone || '')

      const driver = await this.userRepository.findOneById(driverId)

      const userPhone = order.getPropsCopy().user_phone;
      if (userPhone && driver) {
        const user = await this.whatsappUserRepository.findOneByPhone(userPhone);
        if (!user) {
          throw new Error("SOMETHING WENT WRONG");
        }

        await this.whatsAppService.sendMessage(userPhone + "@c.us", 'Заказ завершен, оцените пожалуйста поездку')

        const clientSocketId = await this.cacheStorageService.getSocketClientId(user.id.value);
        if (clientSocketId) {
          await this.orderRequestGateway.emitEvent(clientSocketId, 'rideEnded', order, driver)
        }
      }
    }
  }
}
