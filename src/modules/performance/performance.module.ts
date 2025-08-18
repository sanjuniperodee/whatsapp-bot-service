import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { UserOrmEntity } from '@infrastructure/database/entities/user.orm-entity';
import { OrderRequestOrmEntity } from '@infrastructure/database/entities/order-request.orm-entity';
import { CloudCacheStorageModule } from '@third-parties/cloud-cache-storage/src/cloud-cache-storage.module';
import { redisConfigFactory } from '@infrastructure/configs/redis.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, OrderRequestOrmEntity]),
    CloudCacheStorageModule.forRootAsync(redisConfigFactory),
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {} 