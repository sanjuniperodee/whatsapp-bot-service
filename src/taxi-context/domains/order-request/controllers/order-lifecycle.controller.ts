import { Body, Controller, Post, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '@infrastructure/guards';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { DomainEventsInterceptor } from '@infrastructure/interceptors/domain-events.interceptor';

// Commands
import { CreateOrderCommand } from '../commands/create-order/create-order.command';
import { AcceptOrderCommand } from '../commands/accept-order/accept-order.command';
import { DriverArrivedCommand } from '../commands/driver-arrived/driver-arrived.command';
import { StartOrderCommand } from '../commands/start-order/start-order.command';
import { CompleteOrderCommand } from '../commands/complete-order/complete-order.command';
import { CancelOrderCommand } from '../commands/cancel-order/cancel-order.command';

// DTOs
import { CreateOrderDto } from '../commands/create-order/create-order.dto';
import { AcceptOrderDto } from '../commands/accept-order/accept-order.dto';
import { DriverArrivedDto } from '../commands/driver-arrived/driver-arrived.dto';
import { StartOrderDto } from '../commands/start-order/start-order.dto';
import { CompleteOrderDto } from '../commands/complete-order/complete-order.dto';
import { CancelOrderDto } from '../commands/cancel-order/cancel-order.dto';

@ApiBearerAuth()
@ApiTags('Order Lifecycle')
@Controller('v1/order-requests')
@UseInterceptors(DomainEventsInterceptor)
export class OrderLifecycleController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Creating order request' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(@Body() dto: CreateOrderDto, @IAM() user: UserOrmEntity) {
    const command = new CreateOrderCommand(
      new UUID(user.id),
      dto.orderType,
      dto.from,
      dto.to,
      dto.fromMapboxId,
      dto.toMapboxId,
      dto.lat,
      dto.lng,
      dto.price,
      dto.comment,
    );
    return this.commandBus.execute(command);
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Accept order' })
  @ApiBody({ type: AcceptOrderDto })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  async acceptOrder(@Body() dto: AcceptOrderDto, @IAM() user: UserOrmEntity) {
    const command = new AcceptOrderCommand(
      new UUID(dto.orderId),
      new UUID(user.id),
    );
    return this.commandBus.execute(command);
  }

  @Post('driver-arrived')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Driver arrived to pickup location' })
  @ApiBody({ type: DriverArrivedDto })
  @ApiResponse({ status: 200, description: 'Driver arrived status updated successfully' })
  async driverArrived(@Body() dto: DriverArrivedDto) {
    console.log('🔍 [DRIVER ARRIVED CONTROLLER] Starting driver arrived controller');
    console.log('🔍 [DRIVER ARRIVED CONTROLLER] DTO:', JSON.stringify(dto, null, 2));
    
    try {
      const command = new DriverArrivedCommand(new UUID(dto.orderId));
      console.log('🔍 [DRIVER ARRIVED CONTROLLER] Command created, executing...');
      const result = await this.commandBus.execute(command);
      console.log('🔍 [DRIVER ARRIVED CONTROLLER] Command executed successfully');
      return result;
    } catch (error) {
      console.error('❌ [DRIVER ARRIVED CONTROLLER] Error:', error);
      throw error;
    }
  }

  @Post('start')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Start ride' })
  @ApiBody({ type: StartOrderDto })
  @ApiResponse({ status: 200, description: 'Order started successfully' })
  async startOrder(@Body() dto: StartOrderDto, @IAM() user: UserOrmEntity) {
    const command = new StartOrderCommand(new UUID(dto.orderId));
    return this.commandBus.execute(command);
  }

  @Post('end')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'End ride' })
  @ApiBody({ type: CompleteOrderDto })
  @ApiResponse({ status: 200, description: 'Ride ended successfully' })
  async completeOrder(@Body() dto: CompleteOrderDto) {
    const command = new CompleteOrderCommand(new UUID(dto.orderId));
    return this.commandBus.execute(command);
  }

  @Post('cancel/:orderId')
  @UseGuards(JwtAuthGuard())
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(@Param('orderId') orderId: string, @Body() dto: CancelOrderDto) {
    const command = new CancelOrderCommand(
      new UUID(orderId),
      dto.reason,
    );
    return this.commandBus.execute(command);
  }
}
