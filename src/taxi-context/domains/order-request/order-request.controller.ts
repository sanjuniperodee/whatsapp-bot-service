
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@infrastructure/guards';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { AuthNService } from '@modules/auth/services/authn.service';
import { UserRepository } from '../../domain-repositories/user/user.repository';
import {
  SignInByPhoneSendCodeService
} from '@domain/user/commands/sign-in-by-phone-send-code/sign-in-by-phone-send-code.service';
import {
  SignInByPhoneConfirmCodeService
} from '@domain/user/commands/sign-in-by-phone-confirm-code/sign-in-by-phone-confirm-code.service';
import {
  SignUpByPhoneCreateUserService
} from '@domain/user/commands/sign-up-by-phone-create-user/sign-up-by-phone-create-create-user.service';
import { OrderRequestRepository } from '../../domain-repositories/order-request/order-request.repository';
import { OrderRequestEntity } from '@domain/order-request/domain/entities/order-request.entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { OrderRequestDto } from '@domain/order-request/domain/dtos/order-request.dto';

@ApiBearerAuth()
@ApiTags('Webhook. Order Requests')
@Controller('v1/order-requests')
export class OrderRequestController {
  constructor(
    private readonly orderRequestRepository: OrderRequestRepository,
  ) {}


  @Get('taxi-order-requests')
  @ApiBearerAuth() // This decorator is for JWT authorization
  @ApiResponse({ status: 200, description: 'Returns all order requests.', type: [OrderRequestDto] })
  @UseGuards(JwtAuthGuard)
  async getMe() {
    const orderRequests =  await this.orderRequestRepository.findMany({orderType: 'TAXI', startTime: undefined})

    return orderRequests.map(orderRequest => {
      return {...orderRequest.getPropsCopy()}
    });
  }
}
