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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';

@ApiBearerAuth()
@ApiTags('Webhook. Users')
@Controller('v1/user')
export class UserController {
  constructor(
    private readonly authService: AuthNService,
    private readonly userRepository: UserRepository,
    private readonly signInByPhoneSendCodeService: SignInByPhoneSendCodeService,
    private readonly signInByPhoneConfirmCodeService: SignInByPhoneConfirmCodeService,
  ) {}

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
  async getMe(@IAM() user: any) {
    return await this.userRepository.findOneById(user.id);
  }
}
