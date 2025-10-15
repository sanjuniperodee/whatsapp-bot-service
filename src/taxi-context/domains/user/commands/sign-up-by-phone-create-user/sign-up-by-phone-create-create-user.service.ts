import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AuthNService } from '@modules/auth/services/authn.service';
import { TokenType } from '@modules/auth/types';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SignUpByPhoneCreateUserRequest } from './sign-up-by-phone-create-create-user.request.dto';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { Phone } from '@domain/shared/value-objects/phone.value-object';

type CreateUserResult = {
  userId: UUID;
  token: string;
  refreshToken: string;
};

@Injectable()
export class SignUpByPhoneCreateUserService {
  constructor(
    private readonly authService: AuthNService,
    private readonly userRepository: UserRepository,
    private commandBus: CommandBus,
  ) {}

  async handle(
    dto: SignUpByPhoneCreateUserRequest,
  ): Promise<CreateUserResult> {
    const { firstName, lastName, phone } = dto;

    const existUserWithPhone = await this.userRepository.existsByPhone(phone);

    if (existUserWithPhone) {
      throw new UnprocessableEntityException('User already registered');
    }


    const user = UserEntity.create({
      phone: new Phone({ value: phone }),
      firstName: firstName,
      lastName: lastName,
      deviceToken: dto.device_token?.trim() || undefined,
    });

    await this.userRepository.save(user);

    // Логируем установку deviceToken если он был передан
    if (dto.device_token && dto.device_token.trim()) {
      console.log(`🔑 DeviceToken установлен при регистрации для нового пользователя ${user.id.value}`);
    }

    const token = await this.authService.createToken(TokenType.USER, { id: user.id.value, phone });
    const refreshToken = await this.authService.createToken(TokenType.REFRESH, { id: user.id.value, phone });

    return { userId: user.id, token, refreshToken };
  }
}
