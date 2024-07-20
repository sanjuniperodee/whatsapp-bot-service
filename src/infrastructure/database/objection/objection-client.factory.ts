import { FactoryProvider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Knex from 'knex';
import { Model } from 'objection';
import * as pg from 'pg';

pg.types.setTypeParser(20, 'text', parseInt); // for parse int8 to number from pg

const OBJECTION_CLIENT_PROVIDER_NAME = 'OBJECTION_CLIENT_PROVIDER_NAME';

export const ObjectionClientFactory: FactoryProvider = {
  provide: OBJECTION_CLIENT_PROVIDER_NAME,
  useFactory: (configService: ConfigService) => {
    const knex = Knex({
      client: 'pg',
      debug: configService.get<string>('nodeEnv') === 'development',
      connection: {
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        user: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
      },
    });

    const logger = new Logger('ObjectionFactoryInit');

    knex
      .raw('SELECT 1')
      .debug(false)
      .then(() => {
        logger.log('PostgreSQL connected');
      })
      .catch((e) => {
        logger.error('PostgreSQL not connected');
        logger.error(e);
      });

    Model.knex(knex);
    return knex;
  },
  inject: [ConfigService],
};
