import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { AuthNService } from '@modules/auth/services/authn.service';
import { TokenType } from '@modules/auth/types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';

export type RefreshTokenResult = {
  token: string;
  userId?: UUID;
  refreshToken?: string;
};

@Injectable()
export class RefreshTokenService {
  constructor(private readonly authService: AuthNService, private readonly userRepository: UserRepository) {}

  async handle(userId: UserOrmEntity['id']): Promise<RefreshTokenResult> {
    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = await this.authService.createToken(TokenType.USER, {
      id: user.id.value,
      phone: user.phone,
    });
    const refreshToken = await this.authService.createToken(TokenType.REFRESH, {
      id: user.id.value,
      phone: user.phone,
    });

    return {
      userId: user.id,
      token,
      refreshToken,
    };
  }
}
