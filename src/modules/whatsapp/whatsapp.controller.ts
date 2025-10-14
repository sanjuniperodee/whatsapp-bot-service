import { Controller, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('send')
  async sendMessage(@Body() body: { phone: string; message: string }) {
    await this.whatsappService.sendMessage(body.phone, body.message);
    return { success: true };
  }
}