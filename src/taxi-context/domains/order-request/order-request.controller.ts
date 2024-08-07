import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { CreateOrderRequest } from '@domain/order-request/services/create-order/create-order-request';
import { JwtSignUpAuthGuard } from '@infrastructure/guards/jwt-sign-up-auth.guard';
import {
  SignUpByPhoneCreateUserRequest
} from '@domain/user/commands/sign-up-by-phone-create-user/sign-up-by-phone-create-create-user.request.dto';
import { SMSCodeRecord } from '@domain/user/types';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { NotFoundError } from 'rxjs';

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('v1/order-requests')
export class OrderRequestController {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  @Post('create-order')
  @ApiOperation({
    summary: 'Creating order request',
  })
  @ApiBody({ type: CreateOrderRequest })
  async createOrder(@Body() input: CreateOrderRequest){

    const { phone, orderType, from, to } = input

    const session = await this.getSMScode(phone)

    if(!session){
      throw new NotFoundError("Session is not found")
    }

    const orderRequest = OrderRequestEntity.create({
      orderType,
      from,
      to,
      comment: session.smsCode,
      user_phone: phone
    })

    await this.orderRequestRepository.save(orderRequest)

    await this.orderRequestGateway.handleOrderCreated(orderRequest)

    return orderRequest.getPropsCopy()
  }


  @Get('cancel/:session')
  @ApiOperation({
    summary: 'Get order status',
  })
  async cancelOrderRequest(@Param('session') session: string){
    const orderRequest = await this.orderRequestRepository.findOne({comment: session})

    if(!orderRequest){
      throw new Error('Session is expired')
    }

    const flag = await this.getSMScode(orderRequest.getPropsCopy().user_phone || '')

    if(!flag || flag.smsCode != session){
      throw new Error('Session is expired')
    }

    await this.orderRequestRepository.delete(orderRequest)

    return orderRequest.getPropsCopy()
  }

  @Get('cancel/:session')
  @ApiOperation({
    summary: 'Get order status',
  })
  async getOrderRequest(@Param('session') session: string){
    const orderRequest = await this.orderRequestRepository.findOne({comment: session})

    if(!orderRequest){
      throw new Error('Session is expired')
    }

    const flag = await this.getSMScode(orderRequest.getPropsCopy().user_phone || '')

    if(!flag || flag.smsCode != session){
      throw new Error('Session is expired')
    }

    return orderRequest.getPropsCopy()
  }

  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }
}
