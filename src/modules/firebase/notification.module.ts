// freedom.module.ts
import { Module } from '@nestjs/common';

import { FirebaseController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  controllers: [FirebaseController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class FirebaseNotificationModule {}
