import { forwardRef, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrderRequestController } from '@domain/order-request/order-request.controller';
import { TaxiContextDomainRepositoriesModule } from '../../domain-repositories/taxi-context-domain-repositories.module';
import { OrderRequestGateway } from '@domain/order-request/order-request.gateway';
import { CloudCacheStorageModule } from '@third-parties/cloud-cache-storage/src';
import { redisConfigFactory } from '@infrastructure/configs/redis.factory';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';
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

const thirdPartyServices = [
  CqrsModule,
  forwardRef(() => WhatsAppModule)
];


const controllers = [OrderRequestController, AdminOrderRequestController];

@Module({
  imports: [...thirdPartyServices, TaxiContextDomainRepositoriesModule, CloudCacheStorageModule.forRootAsync(redisConfigFactory), forwardRef(() => UserModule)],
  providers: [OrderRequestGateway, NotificationService, AcceptOrderService, DriverArrivedService, StartOrderService, CompleteOrderService, CancelOrderService, CreateOrderService, RejectOrderService],
  controllers: [...controllers],
  exports: [OrderRequestGateway]
})
export class OrderRequestModule {}
