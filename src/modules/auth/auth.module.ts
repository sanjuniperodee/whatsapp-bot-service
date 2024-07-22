import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtConfigService } from './configs/jwt-config.service';
import { AuthNService } from './services/authn.service';
import { AuthZService } from './services/authz.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtSignUpStrategy } from './strategies/jwt-sign-up.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useClass: JwtConfigService,
    }),
  ],
  providers: [JwtStrategy, JwtRefreshStrategy, JwtSignUpStrategy, AuthNService, AuthZService],
  exports: [AuthNService, AuthZService],
})
export class AuthModule {}
