import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { OrderStatus } from '@infrastructure/enums';
import { NotificationService } from '@modules/firebase/notification.service';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';

@Injectable()
export class OrderCancellationSchedulerService {
  private readonly logger = new Logger(OrderCancellationSchedulerService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly userRepository: UserRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCancellations() {
    this.logger.log('Checking for expired orders to cancel...');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    try {
      const ordersToCancel = await OrderRequestOrmEntity.query()
        .where('orderStatus', OrderStatus.CREATED)
        .where('createdAt', '<', tenMinutesAgo);

      if (ordersToCancel.length === 0) {
        this.logger.log('No expired orders to cancel.');
        return;
      }

      this.logger.log(`Found ${ordersToCancel.length} expired orders to cancel.`);

      for (const order of ordersToCancel) {
        await OrderRequestOrmEntity.query()
          .findById(order.id)
          .patch({
            orderStatus: OrderStatus.REJECTED, // Or a new CANCELLED_AUTO status if preferred
            updatedAt: new Date(),
          });

        this.logger.log(`Order ${order.id} cancelled due to no driver acceptance.`);

        // Send push notification to the client
        const client = await this.userRepository.findOneById(order.clientId);
        if (client && client.getPropsCopy().deviceToken) {
          await this.notificationService.sendNotificationByUserId(
            'Заказ отменен',
            'К сожалению, ваш заказ был отменен, так как не было найдено водителей в течение 10 минут. Попробуйте создать заказ снова.',
            client.getPropsCopy().deviceToken,
          );
          this.logger.log(`Notification sent to client ${client.id.value} for cancelled order ${order.id}.`);
        }
      }
      this.logger.log('Finished checking for expired orders.');
    } catch (error) {
      this.logger.error('Error during automatic order cancellation:', error);
    }
  }
} 