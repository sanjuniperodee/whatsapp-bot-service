// knexfile.ts
import { config as dotEnvConfig } from 'dotenv';
import type { Knex } from 'knex';

dotEnvConfig();

const connectionConfig = {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
};

const migrationConfig = {
      directory: './database/migrations',
      stub: './database/migration.stub',
      extension: 'ts',
      loadExtensions: ['.ts'],
};

const seedConfig = {
      directory: './database/seeds',
      stub: './database/seed.stub',
      extension: 'ts',
      loadExtensions: ['.ts'],
};

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: connectionConfig,
    searchPath: ['public'],
    migrations: migrationConfig,
    seeds: seedConfig,
  },
  production: {
    client: 'pg',
    connection: connectionConfig,
    searchPath: ['public'],
    migrations: migrationConfig,
    seeds: seedConfig,
  },
};

// Export default based on NODE_ENV
export default config[process.env.NODE_ENV || 'development'];
