import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, lastValueFrom } from 'rxjs';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
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

    await result;

    return result;
  }

  handleRequest(err: Error, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
