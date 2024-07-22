import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignInByPhoneSendCodeRequest } from './sign-in-by-phone-send-code.request.dto';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';

@Injectable()
export class SignInByPhoneSendCodeService {
  smsCodeExpiresIn: number;
  smsCodeLength: number;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {
    this.smsCodeExpiresIn = configService.get<number>('smsCode.expiresInSeconds') as number;
    this.smsCodeLength = configService.get<number>('smsCode.codeLength') as number;
  }

  async handle(dto: SignInByPhoneSendCodeRequest) {
    const { phone } = dto;

    const user = await this.userRepository.findOneByPhone(phone)

    if(!user){
      throw new Error("User does not exist!")
    }

    const expirationResult = this.checkExpiration(phone);

    if (!expirationResult) {
      throw new Error('You can require 1 sms in 1 minute');
    }

    let smscode = this.generateSms();

    await UserOrmEntity.query().updateAndFetchById(user.id.value, {lastSms: smscode.toString()})

    return smscode;
  }

  generateSms(): number {
    return Math.floor(1000 + Math.random() * 9000);
  }

  checkExpiration(phone: string): boolean {
    return true;
  }
}
