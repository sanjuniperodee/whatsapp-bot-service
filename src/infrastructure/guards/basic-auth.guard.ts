import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const b64auth = (request?.headers.authorization || '').split(' ')[1] || '';
    const [username, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (
      username === this.configService.get<string>('serverless.username') &&
      password === this.configService.get<string>('serverless.password')
    ) {
      return true;
    }
    return false;
  }
}
