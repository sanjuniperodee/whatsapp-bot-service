import { AuthNService } from '@modules/auth/services/authn.service';
import { TokenType } from '@modules/auth/types';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  UnauthorizedException,
  mixin,
  Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable, lastValueFrom } from 'rxjs';

export function JwtAuthGuard(...tokenTypes: TokenType[]): Type<CanActivate> {
  class Guard extends AuthGuard('jwt') {
    constructor(
      @Inject(AuthNService) private readonly authService: AuthNService,
      private reflector: Reflector
    ) {
      super();
      tokenTypes = tokenTypes.length ? tokenTypes : [TokenType.USER];
    }

    getRequest(context: ExecutionContext) {
      return context.switchToHttp().getRequest();
    }

    async canActivate(context: ExecutionContext) {
      let result = super.canActivate(context);

      if (result instanceof Observable) {
        result = lastValueFrom(result);
      } else {
        result = Promise.resolve(result);
      }

      try {
        await result;
      } catch (error: any) {
        const isAllowWithoutToken = this.reflector.get<boolean>(
          'isAllowUnauthorized',
          context.getHandler()
        );

        if (error?.response?.statusCode === 401 && isAllowWithoutToken) {
          return true;
        }

        throw error;
      }

      const request = this.getRequest(context);
      const token = request.headers.authorization?.split(' ')?.[1];

      if (!token) {
        throw new UnauthorizedException('Token not found');
      }

      const { tokenType } = (await this.authService.verifyTokenAsync(token)) as {
        tokenType: TokenType;
      };

      if (!tokenTypes.includes(tokenType)) {
        return false;
      }

      return result;
    }

    handleRequest(err: Error, user: any) {
      if (err || !user) {
        throw err || new UnauthorizedException('Invalid token');
      }

      return user;
    }
  }

  return mixin(Guard);
}
