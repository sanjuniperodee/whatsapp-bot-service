import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { JwtAuthGuard } from '@infrastructure/guards';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { FirebaseNotificationDto } from './notification.dto';
import { NotificationService } from './notification.service';

@Controller('firebase')
export class FirebaseController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send-notification')
  async sendNotification(@Body() input: FirebaseNotificationDto): Promise<string> {
    const { deviceToken, title, body } = input;

    await this.notificationService.sendNotification(deviceToken, title, body, {});

    return 'Notification sent!';
  }
}
