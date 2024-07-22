import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

@Module({
  imports: [
    AuthModule,
    TaxiContextDomainRepositoriesModule,
    TaxiContextModule,
    DatabaseModule,
    WhatsAppModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfiguration],
      validationSchema: validationSchema,
      validationOptions: { abortEarly: true },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts}'],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
