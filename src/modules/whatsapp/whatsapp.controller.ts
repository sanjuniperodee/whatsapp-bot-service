import { Controller, Get, Param, Post, Render } from "@nestjs/common";
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

@Controller('taxi')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

}
