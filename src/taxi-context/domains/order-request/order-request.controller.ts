import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('v1/order-requests')
export class OrderRequestController {
  constructor(
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly orderRequestRepository: OrderRequestRepository,
  ) {}

  // @Get('/')
  // async function1(){
  //   const orderRequests = await this.orderRequestRepository.findMany({ orderType: 'TAXI', startTime: undefined });
  //
  //   for(const orderRequest of orderRequests){
  //     await this.orderRequestGateway.handleOrderCreated(orderRequest)
  //   }
  // }
}
