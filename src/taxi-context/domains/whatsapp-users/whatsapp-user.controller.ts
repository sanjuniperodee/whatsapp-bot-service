import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
@ApiBearerAuth()
@ApiTags('Webhook. WhatsappUsers')
@Controller('v1/user')
export class WhatsappUserController {
  constructor(
  ) {}
}
