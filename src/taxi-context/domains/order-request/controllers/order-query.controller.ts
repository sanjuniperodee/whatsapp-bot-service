import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '@infrastructure/guards';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderType } from '@infrastructure/enums';

// Queries
import { GetClientActiveOrderQuery } from '../queries/get-client-active-order/get-client-active-order.query';
import { GetDriverActiveOrderQuery } from '../queries/get-driver-active-order/get-driver-active-order.query';
import { GetOrderStatusQuery } from '../queries/get-order-status/get-order-status.query';
import { GetActiveOrdersByTypeQuery } from '../queries/get-active-orders-by-type/get-active-orders-by-type.query';
import { GetOrderHistoryQuery } from '../queries/get-order-history/get-order-history.query';
import { GetClientOrderHistoryQuery } from '../queries/get-client-order-history/get-client-order-history.query';

@ApiBearerAuth()
@ApiTags('Order Queries')
@Controller('v1/order-requests')
export class OrderQueryController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('client-active-order')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get client active order' })
  @ApiResponse({ status: 200, description: 'Active order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getClientActiveOrder(@IAM() user: UserOrmEntity) {
    const query = new GetClientActiveOrderQuery(new UUID(user.id));
    return this.queryBus.execute(query);
  }

  @Get('my-active-order')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get driver active order' })
  @ApiResponse({ status: 200, description: 'Active order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getDriverActiveOrder(@IAM() user: UserOrmEntity) {
    const query = new GetDriverActiveOrderQuery(new UUID(user.id));
    return this.queryBus.execute(query);
  }

  @Get('order-status')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get order status' })
  @ApiResponse({ status: 200, description: 'Order status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderStatus(@IAM() user: UserOrmEntity) {
    const query = new GetOrderStatusQuery(new UUID(user.id));
    return this.queryBus.execute(query);
  }

  @Get('active/:type')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get active orders by type' })
  @ApiResponse({ status: 200, description: 'Active orders retrieved successfully' })
  async getActiveOrdersByType(
    @Param('type') type: OrderType, 
    @IAM() user: UserOrmEntity,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const query = new GetActiveOrdersByTypeQuery(
      type,
      limit || 50,
      offset || 0
    );
    return this.queryBus.execute(query);
  }

  @Get('history/:type')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get my order history' })
  @ApiResponse({ status: 200, description: 'Order history retrieved successfully' })
  async getMyOrderHistoryByType(
    @IAM() user: UserOrmEntity, 
    @Param('type') type: OrderType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const query = new GetOrderHistoryQuery(
      new UUID(user.id),
      type,
      limit || 50,
      offset || 0
    );
    return this.queryBus.execute(query);
  }

  @Get('client-history/:type')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Get client order history' })
  @ApiResponse({ status: 200, description: 'Client order history retrieved successfully' })
  async getClientOrderHistoryByType(
    @IAM() user: UserOrmEntity, 
    @Param('type') type: OrderType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    const query = new GetClientOrderHistoryQuery(
      new UUID(user.id),
      type,
      limit || 50,
      offset || 0
    );
    return this.queryBus.execute(query);
  }
}
