import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignInByPhoneSendCodeRequest } from './sign-in-by-phone-send-code.request.dto';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { CloudCacheStorageService } from '../../../../../third-parties/cloud-cache-storage/src';
import { SMSCodeRecord } from '@domain/user/types';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';

@Injectable()
export class SignInByPhoneSendCodeService {
  smsCodeExpiresIn: number;
  smsCodeLength: number;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
    private readonly cacheStorageService: CloudCacheStorageService,
    private readonly whatsAppService: WhatsAppService,
  ) {
    this.smsCodeExpiresIn = configService.get<number>('smsCode.expiresInSeconds') as number;
    this.smsCodeLength = configService.get<number>('smsCode.codeLength') as number;
  }

  async handle(dto: SignInByPhoneSendCodeRequest) {
    const phone = dto.phone.replace(/ /g, '');

    let codeRecord: SMSCodeRecord | null = await this.getSMScode('+' + phone);

    if (codeRecord) {
      // return codeRecord.smsCode
      throw new Error("Код можно отправить раз в 60 секунд")
    }

    let smscode: string | null = this.generateSmsCode();

    await this.saveSMSCode(smscode, '+' + phone);
    if(phone != '77051479003')
    await fetch("https://api.mobizon.kz/service/message/sendsmsmessage?recipient=" + phone + "&text=Код для входа " + smscode + "&apiKey=kz0502f56621750a9ca3ac636e8301e235c2b647839531f2994222514c786fb6ff2178")

    await this.whatsAppService.sendMessage(phone + "@c.us", `Ваш код для входа: ${smscode}`);

    return smscode
  }

  generateSmsCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }


  private saveSMSCode(smsCode: string, phone: string): SMSCodeRecord {
    const { expDate } = this.cacheStorageService.setValueWithExp(phone, { smsCode }, this.smsCodeExpiresIn);

    return {
      smsCode,
      expDate,
    };
  }

  private getSMScode(phone: string): Promise<SMSCodeRecord | null> {
    return this.cacheStorageService.getValue(phone);
  }
}
