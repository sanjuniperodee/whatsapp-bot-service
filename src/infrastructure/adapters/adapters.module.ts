import { Module } from '@nestjs/common';
import { FirebaseNotificationAdapter } from './firebase-notification.adapter';
import { TwoGisGeocodingAdapter } from './2gis-geocoding.adapter';
import { RedisLocationCacheAdapter } from './redis-location-cache.adapter';
import { NotificationService } from '@modules/firebase/notification.service';
import { UserRepository } from '../../taxi-context/domain-repositories/user/user.repository';
import { CloudCacheStorageService, CloudCacheStorageModule } from '@third-parties/cloud-cache-storage/src';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    DatabaseModule, 
    LoggerModule,
    CloudCacheStorageModule.forRootAsync({
      useFactory: () => ({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'BekkhnN017',
        db: parseInt(process.env.REDIS_DB || '0'),
      }),
    }),
  ],
  providers: [
    {
      provide: 'NotificationPort',
      useClass: FirebaseNotificationAdapter,
    },
    {
      provide: 'GeocodingPort',
      useClass: TwoGisGeocodingAdapter,
    },
    {
      provide: 'LocationCachePort',
      useClass: RedisLocationCacheAdapter,
    },
    // Dependencies
    NotificationService,
    UserRepository,
    CloudCacheStorageService,
  ],
  exports: [
    'NotificationPort',
    'GeocodingPort',
    'LocationCachePort',
    NotificationService,
    UserRepository,
    CloudCacheStorageService,
  ],
})
export class AdaptersModule {}
