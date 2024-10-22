import {
  Controller,
  Get,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { UserRepository } from '../../domain-repositories/user/user.repository';
import { JwtAuthGuard } from '@infrastructure/guards';
import { IAM } from '@infrastructure/decorators/iam.decorator';
import { AuthNService } from '@modules/auth/services/authn.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  SignInByPhoneSendCodeResponse
} from '@domain/user/commands/sign-in-by-phone-send-code/sign-in-by-phone-send-code.response.dto';
import {
  SignInByPhoneSendCodeRequest
} from '@domain/user/commands/sign-in-by-phone-send-code/sign-in-by-phone-send-code.request.dto';
import {
  SignInByPhoneSendCodeService
} from '@domain/user/commands/sign-in-by-phone-send-code/sign-in-by-phone-send-code.service';
import {
  SignInByPhoneConfirmCodeRequest
} from '@domain/user/commands/sign-in-by-phone-confirm-code/sign-in-by-phone-confirm-code.request.dto';
import {
  SignInByPhoneConfirmCodeResponse
} from '@domain/user/commands/sign-in-by-phone-confirm-code/sign-in-by-phone-confirm-code.response.dto';
import {
  SignInByPhoneConfirmCodeService
} from '@domain/user/commands/sign-in-by-phone-confirm-code/sign-in-by-phone-confirm-code.service';
import {
  SignUpByPhoneCreateUserRequest
} from '@domain/user/commands/sign-up-by-phone-create-user/sign-up-by-phone-create-create-user.request.dto';
import {
  SignUpByPhoneCreateUserResponse
} from '@domain/user/commands/sign-up-by-phone-create-user/sign-up-by-phone-create-create-user.response.dto';
import {
  SignUpByPhoneCreateUserService
} from '@domain/user/commands/sign-up-by-phone-create-user/sign-up-by-phone-create-create-user.service';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { JwtSignUpAuthGuard } from '@infrastructure/guards/jwt-sign-up-auth.guard';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { OrderStatus } from '@infrastructure/enums';
import { SetDeviceTokenRequest } from '@domain/order-request/services/set-device-token/set-device-token.request';

@ApiBearerAuth()
@ApiTags('Webhook. Users')
@Controller('v1/user')
export class UserController {
  constructor(
    private readonly authService: AuthNService,
    private readonly userRepository: UserRepository,
    private readonly signInByPhoneSendCodeService: SignInByPhoneSendCodeService,
    private readonly signInByPhoneConfirmCodeService: SignInByPhoneConfirmCodeService,
    private readonly signUpByPhoneCreateUserService: SignUpByPhoneCreateUserService
  ) {}


  @UseGuards(JwtSignUpAuthGuard)
  @Post('sing-up-by-phone')
  @ApiOperation({
    summary: 'Creating user',
  })
  @ApiBody({ type: SignUpByPhoneCreateUserRequest })
  async createUser(
    @Body() input: SignUpByPhoneCreateUserRequest,
  ): Promise<SignUpByPhoneCreateUserResponse> {
      const result = await this.signUpByPhoneCreateUserService.handle(input);

      const { userId, token, refreshToken } = result;


      const user = userId ? await this.userRepository.findOneById(userId?.value) : undefined

      return {
        user: user,
        token,
        refreshToken,
      }
  }

  @Post('sing-in-by-phone')
  @ApiOperation({
    summary: 'Getting sms code to phone to sign in',
  })
  @ApiBody({ type: SignInByPhoneSendCodeRequest })
  async sendCodeToPhone(@Body() input: SignInByPhoneSendCodeRequest): Promise<SignInByPhoneSendCodeResponse> {
    const result = await this.signInByPhoneSendCodeService.handle(input);

    return SignInByPhoneSendCodeResponse.create({ smscode: result });
  }

  @Post('sing-in-by-phone-confirm-code')
  @ApiOperation({
    summary: 'Confirming sign-in code and get tokens',
  })
  @ApiBody({ type: SignInByPhoneConfirmCodeRequest })
  async confirmCodeByPhone(
    @Body() input: SignInByPhoneConfirmCodeRequest,
  ): Promise<SignInByPhoneConfirmCodeResponse> {
    const result = await this.signInByPhoneConfirmCodeService.handle(input);


    const { userId, token, refreshToken } = result;

    const user = userId ? await this.userRepository.findOneById(userId.value) : null;

    return {
      user: user ? user : undefined,
      token,
      refreshToken,
    };
  }
  @Get('GetMe')
  @UseGuards(JwtAuthGuard())
  async getMe(@IAM() user: UserOrmEntity) {
    const now = new Date();

    // Fetch completed orders for the current user
    const orderRequests = await OrderRequestOrmEntity.query()
      .where({ driverId: user.id, orderStatus: OrderStatus.COMPLETED });

    // Calculate the total rating and average rating
    const ratedOrders = orderRequests.filter(order => !!order.rating);

    const totalRating = ratedOrders.reduce((sum, order) => sum + (order.rating || 0), 0);
    const rating = ratedOrders.length > 0 ? totalRating / ratedOrders.length : 0;

    // Define the time ranges for today, this week, and this month
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const endOfToday = new Date(now.setHours(23, 59, 59, 999));

    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate earnings and order counts for today
    const earningsToday = orderRequests
      .filter(order => new Date(order.createdAt) >= startOfToday && new Date(order.createdAt) <= endOfToday)
      .reduce((sum, order) => sum + (order.price || 0), 0);
    const ordersToday = orderRequests.filter(order => new Date(order.createdAt) >= startOfToday && new Date(order.createdAt) <= endOfToday).length;

    // Calculate earnings and order counts for this week
    const earningsThisWeek = orderRequests
      .filter(order => new Date(order.createdAt) >= startOfWeek && new Date(order.createdAt) <= endOfToday)
      .reduce((sum, order) => sum + (order.price || 0), 0);
    const ordersThisWeek = orderRequests.filter(order => new Date(order.createdAt) >= startOfWeek && new Date(order.createdAt) <= endOfToday).length;

    // Calculate earnings and order counts for this month
    const earningsThisMonth = orderRequests
      .filter(order => new Date(order.createdAt) >= startOfMonth && new Date(order.createdAt) <= endOfToday)
      .reduce((sum, order) => sum + (order.price || 0), 0);
    const ordersThisMonth = orderRequests.filter(order => new Date(order.createdAt) >= startOfMonth && new Date(order.createdAt) <= endOfToday).length;

    // Return the response with rating, earnings, and order counts
    return {
      ...(await this.userRepository.findOneById(user.id)),
      rating,
      ratedOrders,
      earnings: {
        today: earningsToday,
        thisWeek: earningsThisWeek,
        thisMonth: earningsThisMonth,
      },
      orders: {
        today: ordersToday,
        thisWeek: ordersThisWeek,
        thisMonth: ordersThisMonth,
      },
    };
  }

  @UseGuards(JwtAuthGuard())
  @Post('device')
  @ApiOperation({ summary: 'Set device token' })
  @ApiBody({ type: SetDeviceTokenRequest })
  async addDevice(@IAM() user: UserOrmEntity, @Body() input: SetDeviceTokenRequest): Promise<any> {
    const device = await UserOrmEntity.query().patchAndFetchById(user.id, {
      deviceToken: input.device,
    });
    console.log(input.device)
    return device.deviceToken;
  }
}
