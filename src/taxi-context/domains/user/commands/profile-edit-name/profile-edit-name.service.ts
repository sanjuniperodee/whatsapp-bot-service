import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/taxi-context/domain-repositories/user/user.repository';

import { ProfileEditNameRequest } from './profile-edit-name.request.dto';

@Injectable()
export class ProfileEditNameService {
  constructor(private readonly userRepository: UserRepository) {}

  async handle(dto: ProfileEditNameRequest, userId: UserOrmEntity['id']): Promise<UUID | NotFoundException> {
    const { firstName, lastName, middleName } = dto;

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return new NotFoundException('User not found');
    }

    await UserOrmEntity.query().updateAndFetchById(user.id.value, {firstName: firstName, lastName: lastName, middleName: middleName})

    return user.id;
  }
}
