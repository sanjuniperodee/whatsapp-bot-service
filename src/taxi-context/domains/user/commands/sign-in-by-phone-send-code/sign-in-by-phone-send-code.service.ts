import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignInByPhoneSendCodeRequest } from './sign-in-by-phone-send-code.request.dto';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { CloudCacheStorageService } from '../../../../../third-parties/cloud-cache-storage/src';
import { SMSCodeRecord } from '@domain/user/types';
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service';
import moment from 'moment';

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

    let codeRecord: SMSCodeRecord | null = await this.getSMScode(phone);

    const expirationResult = this.checkExpiration(codeRecord);

    if (expirationResult) {
      throw new Error("Code Expired")
    }

    let smscode: string | null = this.generateSmsCode();

    codeRecord = this.saveSMSCode(smscode, phone);

    await this.whatsAppService.sendMessage(phone + "@c.us", smscode);

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

  private checkExpiration(codeRecord: SMSCodeRecord | null): boolean {
    if (!codeRecord) {
      return true;
    }

    const dateDiff = moment.duration(moment(codeRecord.expDate).diff(moment()));

    return dateDiff.get('seconds') > 60;
  }
}
