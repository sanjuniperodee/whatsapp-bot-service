import { Module } from '@nestjs/common';

import { ObjectionClientFactory } from './objection-client.factory';

const providers = [ObjectionClientFactory];

@Module({
  providers: [...providers],
  exports: [...providers],
})
export class ObjectionModule {}
