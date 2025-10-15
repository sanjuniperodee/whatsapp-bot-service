import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderRequestController } from '@domain/order-request/order-request.controller';
import { OrderLifecycleController } from './controllers/order-lifecycle.controller';
import { OrderQueryController } from './controllers/order-query.controller';
import { DriverStatsController } from './controllers/driver-stats.controller';
import { TaxiContextDomainRepositoriesModule } from '../../domain-repositories/taxi-context-domain-repositories.module';
import { CloudCacheStorageModule } from '@third-parties/cloud-cache-storage/src';
import { redisConfigFactory } from '@infrastructure/configs/redis.factory';
import { AcceptOrderService } from '@domain/order-request/services/accept-order/accept-order.service';
import { DriverArrivedService } from '@domain/order-request/services/driver-arrived/driver-arrived.service';
import { StartOrderService } from '@domain/order-request/services/start-order/start-order.service';
import { CompleteOrderService } from '@domain/order-request/services/complete-order/complete-order.service';
import { CancelOrderService } from '@domain/order-request/services/cancel-order/cancel-order.service';
import { CreateOrderService } from '@domain/order-request/services/create-order/create-order.service';
import { RejectOrderService } from '@domain/order-request/services/reject-order/reject-order.service';
import { NotificationService } from '@modules/firebase/notification.service';
import { AdminOrderRequestController } from '@domain/order-request/order-request-admin.controller';
import { UserModule } from '@domain/user/user.module';
import { OrderCancellationSchedulerService } from './services/order-cancellation/order-cancellation-scheduler.service';
import { CreateOrderHandler } from './commands/create-order/create-order.handler';
import { AcceptOrderHandler } from './commands/accept-order/accept-order.handler';
import { DriverArrivedCommandHandler } from './commands/driver-arrived/driver-arrived.handler';
import { StartOrderHandler } from './commands/start-order/start-order.handler';
import { CompleteOrderHandler } from './commands/complete-order/complete-order.handler';
import { CancelOrderHandler } from './commands/cancel-order/cancel-order.handler';
import { GetClientActiveOrderHandler } from './queries/get-client-active-order/get-client-active-order.handler';
import { GetDriverActiveOrderHandler } from './queries/get-driver-active-order/get-driver-active-order.handler';
import { OrderCreatedHandler } from './event-handlers/order-created.handler';
import { OrderAcceptedHandler } from './event-handlers/order-accepted.handler';
import { DriverArrivedHandler } from './event-handlers/driver-arrived.handler';
import { OrderStartedHandler } from './event-handlers/order-started.handler';
import { OrderCompletedHandler } from './event-handlers/order-completed.handler';
import { OrderCancelledHandler } from './event-handlers/order-cancelled.handler';
import { ConnectionManagerService } from './websocket/connection-manager.service';
import { NotificationService as WebSocketNotificationService } from './websocket/notification.service';
import { LocationTrackingService } from './websocket/location-tracking.service';
import { SocketCleanupService } from './websocket/socket-cleanup.service';
import { OrderRequestGateway as NewOrderRequestGateway } from './websocket/order-request.gateway';
import { ActiveOrderReadRepository } from './repositories/active-order-read.repository';
import { OrderHistoryReadRepository } from './repositories/order-history-read.repository';
import { DriverStatsReadRepository } from './repositories/driver-stats-read.repository';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';

const thirdPartyServices = [
  CqrsModule,
];


const controllers = [
  OrderRequestController, 
  AdminOrderRequestController,
  OrderLifecycleController,
  OrderQueryController,
  DriverStatsController,
];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule, CloudCacheStorageModule.forRootAsync(redisConfigFactory), UserModule, WhatsAppModule],
  providers: [
    // Legacy services (будут удалены в следующих фазах)
    NotificationService, 
    AcceptOrderService, 
    DriverArrivedService, 
    StartOrderService, 
    CompleteOrderService, 
    CancelOrderService, 
    CreateOrderService, 
    RejectOrderService, 
    OrderCancellationSchedulerService,
    // CQRS Handlers
    CreateOrderHandler,
    AcceptOrderHandler,
    DriverArrivedCommandHandler,
    StartOrderHandler,
    CompleteOrderHandler,
    CancelOrderHandler,
    GetClientActiveOrderHandler,
    GetDriverActiveOrderHandler,
    // Event Handlers
    OrderCreatedHandler,
    OrderAcceptedHandler,
    DriverArrivedHandler,
    OrderStartedHandler,
    OrderCompletedHandler,
    OrderCancelledHandler,
    // WebSocket Services
    ConnectionManagerService,
    WebSocketNotificationService,
    LocationTrackingService,
    SocketCleanupService,
    NewOrderRequestGateway,
    // Read Repositories
    ActiveOrderReadRepository,
    OrderHistoryReadRepository,
    DriverStatsReadRepository,
  ],
  controllers: [...controllers],
  exports: [NewOrderRequestGateway]
})
export class OrderRequestModule {}
