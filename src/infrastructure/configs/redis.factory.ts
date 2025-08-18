import { ConfigService } from '@nestjs/config';
import { CloudCacheModuleOptions } from '../../third-parties/cloud-cache-storage/src';

export const redisConfigFactory = {
  useFactory: (configService: ConfigService): CloudCacheModuleOptions => {
    return {
      port: configService.get<number>('REDIS_PORT', 6379),
      host: configService.get<string>('REDIS_HOST', 'redis'),
      password: configService.get<string>('REDIS_PASSWORD', 'BekkhnN017'),
    };
  },
  inject: [ConfigService],
};
