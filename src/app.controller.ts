import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UserEntity } from '@domain/user/domain/entities/user.entity';
import { UserRepository } from './taxi-context/domain-repositories/user/user.repository';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
              private readonly userRepository: UserRepository,
  ) {}
  @Get('/')
  async getHello(): Promise<UserEntity[]> {
    return await this.userRepository.findMany({})
  }
}
