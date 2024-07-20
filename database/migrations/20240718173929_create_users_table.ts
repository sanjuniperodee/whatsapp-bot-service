import type { Knex } from 'knex';

const tableName = 'users';

export async function up(knex: Knex) {
  knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  return knex.schema.createTableIfNotExists(tableName, async (t) => {
    t.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    t.string('phone', 16).unique().index();
    t.string('firstName', 320).notNullable();
    t.string('lastName', 320).notNullable();
    t.string('middleName', 320);
    t.string('birthDate', 16).notNullable();
    t.string('lastSms', 4);
    t.timestamp('createdAt').defaultTo(knex.fn.now());
    t.timestamp('updatedAt').defaultTo(knex.fn.now());
    t.timestamp('deletedAt');
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTableIfExists(tableName);
}