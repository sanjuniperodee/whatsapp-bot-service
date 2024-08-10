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

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('v1/order-requests')
export class OrderRequestController {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly userRepository: UserRepository,
    private readonly whatsappUserRepository: WhatsappUserRepository,
  ) {}

  @Get('status/:session')
  @ApiOperation({ summary: 'Get order status' })
  async getOrderStatus(@Param('session') session: string) {
    const orderRequest = await this.orderRequestRepository.findOne({ comment: session });
    if (!orderRequest) {
      throw new Error('Session is expired');
    }

    const flag = await this.getSMScode(orderRequest.getPropsCopy().user_phone || '');
    if (!flag || flag.smsCode !== session) {
      throw new Error('Session is expired');
    }

    const driver = await this.userRepository.findOneById(orderRequest.id.value);

    return {orderRequest: orderRequest.getPropsCopy(), driver}
  }

  @Post('create-order')
  @ApiOperation({ summary: 'Creating order request' })
  @ApiBody({ type: CreateOrderRequest })
  async createOrder(@Body() input: CreateOrderRequest) {
    const { phone, orderType, from, to, lat, lng, socketId } = input;
    const session = await this.getSMScode(phone);

    console.log(session)

    if (!session?.smsCode) {
      throw new NotFoundError("Session is not found");
    }

    const orderRequest = OrderRequestEntity.create({
      orderType,
      orderstatus: OrderStatus.CREATED,
      from,
      to,
      lat,
      lng,
      comment: session.smsCode,
      user_phone: phone
    });

    const user = await this.whatsappUserRepository.findOneByPhone(phone)

    console.log(user)

    await this.orderRequestRepository.save(orderRequest);
    await this.cacheStorageService.setValue(user?.id.value || '', { socketId: socketId } );
    await this.orderRequestGateway.handleOrderCreated(orderRequest);

    return orderRequest.getPropsCopy();
  }


  @UseGuards(JwtAuthGuard)
  @Get('active-orders')
  @ApiOperation({ summary: 'Get active orders' })
  async getActiveOrders() {
    const orderRequests = await this.orderRequestRepository.findMany({ orderstatus: OrderStatus.CREATED })
    return orderRequests.map(async orderRequest => {
      const user = await this.whatsappUserRepository.findOneByPhone(orderRequest.getPropsCopy().user_phone || '');
      return {
        user,
        orderRequest
      }
    });
  }

  @Get('cancel/:session')
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrderRequest(@Param('session') session: string) {
    const orderRequest = await this.orderRequestRepository.findOne({ comment: session });
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

  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }
}
