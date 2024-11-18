import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { Err, Ok, Result } from 'oxide.ts';
import { HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from 'src/taxi-context/domain-repositories/user/user.repository';
import { LoginRequest } from '@domain/user/commands/login/login.request.dto';
import { AuthNService } from '@modules/auth/services/authn.service';
import { TokenType } from '@modules/auth/types';
type EmailToken = {
  token: string;
  refreshToken?: string;
  userId?: string;
};
@Injectable()
export class LoginService {
  constructor(private readonly userRepository: UserRepository, private readonly authService: AuthNService) {}

  async handle(dto: LoginRequest): Promise<Result<EmailToken, HttpException>> {
    const login = dto.username.replace(/ /g, '');
    const userResult = await UserOrmEntity.query().where('phone', login).first();


    if (!userResult || !userResult.phone) {
      return Err(new NotFoundException('Login not found'));
    }

    const userId = userResult.id;

    const user = await this.userRepository.findOneById(userResult.id);

    if (!user) {
      return Err(new NotFoundException('User ad not found'));
    }

    // const encryptedPassword = crypto.createHmac('sha256', dto.password).digest('hex');
    //
    // if (user.password !== encryptedPassword) {
    //   return Err(new UnauthorizedException('Invalid login or password'));
    // }

    const token = await this.authService.createToken(TokenType.USER, { id: userId, email: userResult.phone });
    const refreshToken = await this.authService.createToken(TokenType.REFRESH, { id: userId, email: userResult.phone });

    return Ok({ userId, token, refreshToken });
  }
}
