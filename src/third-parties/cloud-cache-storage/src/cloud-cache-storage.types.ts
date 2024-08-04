import { ModuleMetadata, Type } from '@nestjs/common';
import { RedisOptions } from 'ioredis';

export const CLOUD_CACHE_OPTIONS_PROVIDER_NAME = 'CLOUD_CACHE_STORAGE';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudCacheModuleOptions extends RedisOptions {}

export interface CloudCacheOptionsFactory {
  createOptions(): Promise<CloudCacheModuleOptions> | CloudCacheModuleOptions;
}

export interface CloudCacheModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<CloudCacheModuleOptions> | CloudCacheModuleOptions;
  useClass?: Type<CloudCacheOptionsFactory>;
  inject?: any[];
}
