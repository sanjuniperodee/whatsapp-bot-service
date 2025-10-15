import { BadRequestException, Body, Injectable } from '@nestjs/common';
import { ChangeOrderStatus } from '@domain/order-request/services/accept-order/accept-order.request';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { OrderStatus } from '@infrastructure/enums';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { OrderRequestRepository } from '../../../../domain-repositories/order-request/order-request.repository';
import { OrderRequestGateway } from '../../websocket/order-request.gateway';
import { CloudCacheStorageService } from '@third-parties/cloud-cache-storage/src';
import { CategoryLicenseRepository } from '../../../../domain-repositories/category-license/category-license.repository';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { NotificationService } from '@modules/firebase/notification.service';

@Injectable()
export class AcceptOrderService{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly orderRequestRepository: OrderRequestRepository,
    private readonly categoryLicenseRepository: CategoryLicenseRepository,
    private readonly orderRequestGateway: OrderRequestGateway,
    private readonly notificationService: NotificationService,
    private readonly cacheStorageService: CloudCacheStorageService,
  ) {}

  async handle(input: ChangeOrderStatus, driver: UserOrmEntity) {
    console.log('🔍 [ACCEPT SERVICE] Starting accept order service');
    const { orderId } = input;
    const driverId = driver.id
    console.log('🔍 [ACCEPT SERVICE] OrderId:', orderId);
    console.log('🔍 [ACCEPT SERVICE] DriverId:', driverId);
    
    const orderRequest = await this.orderRequestRepository.findActiveByDriverId(driverId)
    console.log('🔍 [ACCEPT SERVICE] Active order for driver:', orderRequest ? 'EXISTS' : 'NONE');

    if (orderRequest) {
      console.log('🔍 [ACCEPT SERVICE] Driver already has active order, returning early');
      return 'You already have active order'
    }

    const order = await this.orderRequestRepository.findOneById(orderId);
    console.log('🔍 [ACCEPT SERVICE] Found order:', order ? 'YES' : 'NO');
    if (order) {
      console.log('🔍 [ACCEPT SERVICE] Order status:', order.getPropsCopy().orderStatus);
    }

    if (order && order.getPropsCopy().orderStatus == OrderStatus.CREATED) {
      console.log('🔍 [ACCEPT SERVICE] Order is in CREATED status, proceeding with accept');
      const category = await this.categoryLicenseRepository.findOne({driverId: new UUID(driverId), categoryType: order.getPropsCopy().orderType})
      console.log('🔍 [ACCEPT SERVICE] Category found:', category ? 'YES' : 'NO');

      if(!category) {
        console.log('❌ [ACCEPT SERVICE] No category found for driver');
        throw new BadRequestException("You can not accept orders before registering into category");
      }

      console.log('🔍 [ACCEPT SERVICE] Accepting order...');
      order.accept(new UUID(driverId));
      console.log('🔍 [ACCEPT SERVICE] Order accepted, saving...');
      await this.orderRequestRepository.save(order);
      console.log('🔍 [ACCEPT SERVICE] Order saved successfully');

      const driver = await this.userRepository.findOneById(driverId)
      console.log('🔍 [ACCEPT SERVICE] Driver found:', driver ? 'YES' : 'NO');

      const client = await this.userRepository.findOneById(order.getPropsCopy().clientId.value)
      console.log('🔍 [ACCEPT SERVICE] Client found:', client ? 'YES' : 'NO');

      if (client && driver) {
        await this.orderRequestGateway.notifyClient(order.getPropsCopy().clientId.value, 'orderAccepted', {
          orderId: order.id.value,
          driverId: order.getPropsCopy().driverId?.value,
          driver: driver.getPropsCopy(),
          timestamp: Date.now()
        });

        await this.orderRequestGateway.broadcastToOnlineDrivers('orderTaken', {
          orderId: order.id.value,
          takenBy: order.getPropsCopy().driverId?.value,
          timestamp: Date.now()
        });

        await this.notificationService.sendNotificationByUserId(
          'Водитель принял ваш заказ',
          `К вам приедет ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`,
          client.getPropsCopy().deviceToken || ''
        )
        // await this.whatsAppService.sendMessage(
        //   userPhone + "@c.us",
        //   `Водитель принял ваш заказ,\nК вам приедет ${category.getPropsCopy().brand} ${category.getPropsCopy().model}.\nЦвет: ${category.getPropsCopy().color}.\nГос номер: ${category.getPropsCopy().number}`
        // )wч1
        console.log('🔍 [ACCEPT SERVICE] Notifications sent successfully');
      } else {
        console.log('❌ [ACCEPT SERVICE] Client or driver not found');
      }
    } else {
      console.log('❌ [ACCEPT SERVICE] Order not found or not in CREATED status');
    }
    console.log('🔍 [ACCEPT SERVICE] Accept order service completed');
  }
}