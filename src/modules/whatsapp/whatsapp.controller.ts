import { Body, Controller, Get, Logger, Param, Post, Render } from '@nestjs/common';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('handle-message')
  async handleIncomingMessage(@Body() input: any){
    Logger.log(input)
    try{
      if(input.typeWebhook == 'incomingMessageReceived')
        return this.whatsappService.handleIncomingMessage(input)
    }
    catch (error: any){

    }
  }

}
