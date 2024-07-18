import { Body, Controller, Get, Param, Post, Render } from '@nestjs/common';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('handle-message')
  async handleIncomingMessage(@Body() input: any){
    console.log(12312323)
    return this.whatsappService.handleIncomingMessage(input)
  }

}
