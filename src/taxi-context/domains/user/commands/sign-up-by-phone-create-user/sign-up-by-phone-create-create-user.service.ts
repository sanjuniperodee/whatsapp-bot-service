import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AuthNService } from '@modules/auth/services/authn.service';
import { TokenType } from '@modules/auth/types';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SignUpByPhoneCreateUserRequest } from './sign-up-by-phone-create-create-user.request.dto';
import { UserRepository } from 'src/taxi-context/domain-repositories/user/user.repository';
import { UserEntity } from '@domain/user/domain/entities/user.entity';

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
    phone: string,
  ): Promise<CreateUserResult | UnprocessableEntityException> {
    const { firstName, lastName } = dto;

    const existUserWithPhone = await this.userRepository.existsByPhone(phone);

    if (existUserWithPhone) {
      return new UnprocessableEntityException('User already registered');
    }


    const user = UserEntity.create({
      phone: phone,
      firstName: firstName,
      lastName: lastName,
    });

    await this.userRepository.save(user);


    const token = await this.authService.createToken(TokenType.USER, { id: user.id.value, phone });
    const refreshToken = await this.authService.createToken(TokenType.REFRESH, { id: user.id.value, phone });

    return { userId: user.id, token, refreshToken };
  }
}
