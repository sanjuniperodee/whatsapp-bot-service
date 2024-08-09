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

  async geoAdd(key: string, longitude: number, latitude: number, member: string): Promise<void> {
    await this._client.geoadd(key, longitude, latitude, member);
  }

  async geoRadius(key: string, longitude: number, latitude: number, radius: number, unit: 'm' | 'km' | 'mi' | 'ft', count: number, sort: 'ASC' | 'DESC'): Promise<string[]> {
    const result = await this._client.georadius(key, longitude, latitude, radius, unit, 'WITHDIST', 'COUNT', count, sort);
    return result.map((item: any) => item[0]); // Extracting member names from the result
  }
}
