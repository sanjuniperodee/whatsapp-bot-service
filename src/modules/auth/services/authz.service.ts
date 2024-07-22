import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { StrategyPayload, TokenPayloadMap, TokenType } from '../types';

@Injectable()
export class AuthZService {
  constructor(
  ) {}

  async validateUser(payload: StrategyPayload): Promise<UserOrmEntity> {
    const { id } = payload;

    const user = await UserOrmEntity.query().findById(id);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async validate(payload: StrategyPayload) {
    const tokePayloadMap: TokenPayloadMap = {
      [TokenType.USER]: this.validateUser.bind(this),
      [TokenType.REFRESH]: this.validateUser.bind(this),
    };

    return tokePayloadMap[payload.tokenType](payload as any);
  }
}
