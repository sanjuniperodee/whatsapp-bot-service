import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

import { JwtPayloadPolymorphData, TokenType } from '../types';

@Injectable()
export class AuthNService {
  private jwtSecret: string;
  private jwtExpiresIn: number;
  private jwtRefreshSecret: string;
  private jwtRefreshExpiresIn: number;
  private jwtSignUpSecret: string;
  private jwtSignUpExpiresIn: number;

  constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService) {
    this.jwtRefreshSecret = this.configService.get<string>('jwt.secret') as string;
    this.jwtExpiresIn = this.configService.get<number>('jwt.expiresIn') as number;
    this.jwtRefreshSecret = this.configService.get<string>('jwt.refreshSecret') as string;
    this.jwtRefreshExpiresIn = this.configService.get<number>('jwt.refreshExpiresIn') as number;
    this.jwtSignUpSecret = this.configService.get<string>('jwt.signUpSecret') as string;
    this.jwtSignUpExpiresIn = this.configService.get<number>('jwt.signUpExpiresIn') as number;
  }

  private getExpirationTime(jwtType: TokenType): Date {
    const expiration = new Date();

    const jwtExpiresInMap = {
      [TokenType.USER]: this.jwtExpiresIn,
      [TokenType.REFRESH]: this.jwtRefreshExpiresIn,
      [TokenType.SIGN_UP]: this.jwtSignUpExpiresIn,
    };

    const expiresIn = jwtExpiresInMap[jwtType];

    expiration.setTime(expiresIn * 1000 + expiration.getTime());

    return expiration;
  }

  private getJwtOptions(jwtType: TokenType): JwtSignOptions {
    const jwtSecretInMap: { [P in TokenType]: JwtSignOptions } = {
      [TokenType.USER]: { secret: this.jwtSecret, expiresIn: this.jwtExpiresIn },
      [TokenType.REFRESH]: { secret: this.jwtRefreshSecret, expiresIn: this.jwtRefreshExpiresIn },
      [TokenType.SIGN_UP]: { secret: this.jwtSignUpSecret, expiresIn: this.jwtSignUpExpiresIn },
    };

    const secret = jwtSecretInMap[jwtType];

    return secret;
  }

  async createToken<T extends TokenType>(type: T, payload: JwtPayloadPolymorphData<T>) {
    const expiration = this.getExpirationTime(type);
    const jwtOptions = this.getJwtOptions(type);

    return this.jwtService.sign({ ...payload, tokenType: type, expiration }, jwtOptions);
  }

  async verifyTokenAsync<T extends object>(token: string) {
    // TODO: probably need to pass options in case validation of sign_up_token or refresh_token
    return this.jwtService.verifyAsync<T>(token);
  }
}
