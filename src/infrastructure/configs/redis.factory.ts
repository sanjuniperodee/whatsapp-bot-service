import { ConfigService } from '@nestjs/config';
import { CloudCacheModuleOptions } from '../../third-parties/cloud-cache-storage/src';

export const redisConfigFactory = {
  useFactory: (configService: ConfigService): CloudCacheModuleOptions => {
    return {
      port: configService.get<number>('redis.common.port'),
      host: configService.get<string>('redis.common.host'),
      password: 'BekkhnN017',
    };
  },
  inject: [ConfigService],
};
