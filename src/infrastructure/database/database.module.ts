import { Module } from '@nestjs/common';

import { ObjectionModule } from './objection/objection.module';
import { UnitOfWorkModule } from './unit-of-work/unit-of-work.module';

@Module({
  imports: [ObjectionModule, UnitOfWorkModule],
  exports: [UnitOfWorkModule],
})
export class DatabaseModule {}
