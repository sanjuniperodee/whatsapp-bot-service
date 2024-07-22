import { config as dotEnvConfig } from 'dotenv';
import type { Knex } from 'knex';

dotEnvConfig();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT as string),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    },
    migrations: {
      directory: './database/migrations',
      stub: './database/migration.stub',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
    seeds: {
      directory: './database/seeds',
      stub: './database/seed.stub',
      extension: 'ts',
      loadExtensions: ['.ts'],
    },
  },
};

module.exports = config;
