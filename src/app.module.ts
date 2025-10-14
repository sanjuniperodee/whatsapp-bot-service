import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
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
import { LoggerModule } from '@infrastructure/logger/logger.module';
import { DomainEventsModule } from '@infrastructure/events/domain-events.module';
import { GeocodingController } from '@infrastructure/controllers/geocoding.controller';
import { AdaptersModule } from '@infrastructure/adapters/adapters.module';
@Module({
  imports: [
    LoggerModule,
    DomainEventsModule,
    AdaptersModule,
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
  ],
  controllers: [AppController, GeocodingController],
  providers: [AppService]
})
export class AppModule {}
