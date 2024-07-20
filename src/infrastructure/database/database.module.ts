import { Module } from '@nestjs/common';

import { ObjectionModule } from './objection/objection.module';

@Module({
  imports: [ObjectionModule],
})
export class DatabaseModule {}
