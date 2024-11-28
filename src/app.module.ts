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
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Путь к папке с файлами
      serveRoot: '/support', // Путь, по которому будет доступна папка
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          console.log('Database Host:', configService.get<string>('DATABASE_HOST'));
          console.log('Database Port:', configService.get<number>('DATABASE_PORT'));
          console.log('Database User:', configService.get<string>('DATABASE_USER'));
          console.log('Database Password:', configService.get<string>('DATABASE_PASSWORD'));
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
            logging: true,
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
