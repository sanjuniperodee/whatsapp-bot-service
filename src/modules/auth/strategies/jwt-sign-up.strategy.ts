import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayloadMap, TokenType } from '../types';

@Injectable()
export class JwtSignUpStrategy extends PassportStrategy(Strategy, 'jwt-sign-up') {
  constructor(readonly configService: ConfigService) {
    super({
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.signUpSecret'),
    });
  }

  async validate(payload: JwtPayloadMap[TokenType.SIGN_UP]): Promise<any> {
    return payload.phone;
  }
}
