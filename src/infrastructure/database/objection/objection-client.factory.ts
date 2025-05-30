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
      searchPath: ['public'],
      pool: {
        min: 2,
        max: 10,
        afterCreate: (conn: any, done: any) => {
          // Set search path to ensure we can find tables
          conn.query('SET search_path TO public', (err: any) => {
            if (err) {
              console.error('Error setting search path:', err);
            }
            done(err, conn);
          });
        }
      }
    });

    const logger = new Logger('ObjectionFactoryInit');

    knex
      .raw('SELECT 1')
      .debug(false)
      .then(() => {
        logger.log('PostgreSQL connected');
        // Test if users table exists
        return knex.schema.hasTable('users');
      })
      .then((exists) => {
        if (exists) {
          logger.log('Users table found');
        } else {
          logger.warn('Users table not found - checking schema...');
          // List all tables to debug
          return knex.raw(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_type = 'BASE TABLE' 
            AND table_name = 'users'
          `).then(result => {
            logger.log('Users table locations:', result.rows);
          });
        }
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
