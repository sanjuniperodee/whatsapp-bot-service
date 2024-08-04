import { Inject, Injectable } from '@nestjs/common';
import * as IoRedis from 'ioredis';
import IoRedisClient from 'ioredis';

import { CLOUD_CACHE_OPTIONS_PROVIDER_NAME, CloudCacheModuleOptions } from '../cloud-cache-storage.types';

@Injectable()
export class RedisService {
  private _client: IoRedis.Redis;
  private _clientForSubscriberMode: IoRedis.Redis;

  constructor(
    @Inject(CLOUD_CACHE_OPTIONS_PROVIDER_NAME)
    private readonly options: CloudCacheModuleOptions,
  ) {
    this._client = this.createClientFromOptions();
    this._clientForSubscriberMode = this.createClientFromOptions();
  }

  private createClientFromOptions() {
    return new IoRedisClient(this.options);
  }

  get client(): IoRedis.Redis {
    return this._client;
  }

  get clientForSubscriberMode(): IoRedis.Redis {
    return this._clientForSubscriberMode;
  }
}
