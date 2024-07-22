import { ProfileEditPhoneRequest } from '@domain/user/commands/profile-edit-phone/profile-edit-phone.request.dto';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { UUID } from '@libs/ddd/domain/value-objects/uuid.value-object';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../../../domain-repositories/user/user.repository';

@Injectable()
export class ProfileEditPhoneService {
  constructor(private readonly userRepository: UserRepository) {}

  async handle(
    dto: ProfileEditPhoneRequest,
    userId: UserOrmEntity['id'],
  ): Promise<UUID> {
    const { phone } = dto;

    const checkPhone = await this.userRepository.findOneByPhone(phone);

    if (checkPhone) {
      throw new Error("User with this phone already exists")
    }

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      throw new Error("User does not exist")
    }

    await UserOrmEntity.query().updateAndFetchById(user.id.value, {phone: phone})

    return user.id;
  }
}
