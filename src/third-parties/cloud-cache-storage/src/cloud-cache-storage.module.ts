import { DynamicModule, Module, Provider, Type } from '@nestjs/common';

import {
  CLOUD_CACHE_OPTIONS_PROVIDER_NAME,
  CloudCacheModuleAsyncOptions,
  CloudCacheOptionsFactory,
} from './cloud-cache-storage.types';
import { CloudCacheStorageService, RedisService } from './services';

@Module({})
export class CloudCacheStorageModule {
  static forRootAsync(options: CloudCacheModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    return {
      module: CloudCacheStorageModule,
      imports: options.imports,
      providers: [...asyncProviders, CloudCacheStorageService, RedisService],
      exports: [CloudCacheStorageService, RedisService],
    };
  }

  private static createAsyncProviders(options: CloudCacheModuleAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<CloudCacheOptionsFactory>;
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(options: CloudCacheModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: CLOUD_CACHE_OPTIONS_PROVIDER_NAME,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = [options.useClass as Type<CloudCacheOptionsFactory>];

    return {
      provide: CLOUD_CACHE_OPTIONS_PROVIDER_NAME,
      useFactory: async (optionsFactory: CloudCacheOptionsFactory) => await optionsFactory.createOptions(),
      inject,
    };
  }
}
