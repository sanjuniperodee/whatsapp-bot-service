import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsAppModule } from '@modules/whatsapp/whatsapp.module';
import { TaxiContextModule } from './taxi-context/taxi-context.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@infrastructure/database/database.module';
import {
  TaxiContextDomainRepositoriesModule
} from './taxi-context/domain-repositories/taxi-context-domain-repositories.module';
import { AuthModule } from '@modules/auth/auth.module';
import { loadConfiguration, validationSchema } from '@infrastructure/configs/environment.config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PerformanceModule } from '@modules/performance/performance.module';

@Module({
  imports: [
    PerformanceModule, // Добавляем модуль производительности
    AuthModule,
    TaxiContextDomainRepositoriesModule,
    TaxiContextModule,
    DatabaseModule,
    WhatsAppModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfiguration],
      validationSchema: validationSchema,
      validationOptions: { abortEarly: true },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/support',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
          
          console.log('Database Host:', configService.get<string>('DATABASE_HOST'));
          console.log('Database Port:', configService.get<number>('DATABASE_PORT'));
          console.log('Database User:', configService.get<string>('DATABASE_USER'));
          console.log('Database Name:', configService.get<string>('DATABASE_NAME'));

          return {
            type: 'postgres',
            host: configService.get<string>('DATABASE_HOST'),
            port: configService.get<number>('DATABASE_PORT'),
            username: configService.get<string>('DATABASE_USER'),
            password: configService.get<string>('DATABASE_PASSWORD'),
            database: configService.get<string>('DATABASE_NAME'),
            entities: [__dirname + '/../**/*.entity{.ts}'],
            synchronize: false,
            logging: isDevelopment, // Отключаем логирование в продакшене
            // Оптимизированные настройки пула
            extra: {
              max: 20, // Увеличиваем максимальное количество соединений
              min: 5,  // Минимальное количество соединений
              acquireTimeoutMillis: 30000,
              createTimeoutMillis: 30000,
              destroyTimeoutMillis: 5000,
              idleTimeoutMillis: 30000,
              reapIntervalMillis: 1000,
              createRetryIntervalMillis: 100,
            },
            // Дополнительные оптимизации
            cache: {
              duration: 30000, // 30 секунд кэширования
            },
            // Включаем автоматическую загрузку сущностей
            autoLoadEntities: true,
          };
        },
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
