import { Module } from '@nestjs/common';

import { UserRepository } from './user/user.repository';
import { UnitOfWork } from '@infrastructure/database/unit-of-work/unit-of-work';
import { OrderRequestRepository } from './order-request/order-request.repository';
import { CategoryLicenseRepository } from './category-license/category-license.repository';

const repositories = [
  CategoryLicenseRepository,
  UserRepository,
  OrderRequestRepository,
  UnitOfWork,
];

@Module({
  providers: repositories,
  exports: repositories,
})
export class TaxiContextDomainRepositoriesModule {}