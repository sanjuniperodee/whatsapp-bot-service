import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthZService } from '../services/authz.service';
import { StrategyPayload } from '../types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(readonly configService: ConfigService, private readonly authZService: AuthZService) {
    super({
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
    });
  }

  async validate(payload: StrategyPayload): Promise<any> {
    return this.authZService.validate(payload);
  }
}
