import { Module } from '@nestjs/common';

import { UserRepository } from './user/user.repository';
import { UnitOfWork } from '@infrastructure/database/unit-of-work/unit-of-work';

const repositories = [
  UserRepository,
  UnitOfWork
];

@Module({
  providers: repositories,
  exports: repositories,
})
export class TaxiContextDomainRepositoriesModule {}