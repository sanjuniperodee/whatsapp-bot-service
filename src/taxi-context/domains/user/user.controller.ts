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

  @Post('sing-up-by-phone')
  @ApiOperation({
    summary: 'Getting sms code to phone to sign in',
  })
  @ApiBody({ type: SignUpByPhoneCreateUserRequest }) // Document request body for Swagger
  async createUser(
    @Body() input: SignUpByPhoneCreateUserRequest,
  ): Promise<SignUpByPhoneCreateUserResponse> {
    console.log(input)
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

    return { smscode: result };
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
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@IAM() user: UserOrmEntity) {
    console.log(user)
    return await this.userRepository.findOneById(user.id);
  }
}
