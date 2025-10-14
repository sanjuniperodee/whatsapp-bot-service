import type { Knex } from 'knex';

const tableName = 'users';

export async function up(knex: Knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  return knex.schema.createTable(tableName, async (t) => {
    t.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    t.string('phone', 16).unique().index();
    t.string('firstName', 320);
    t.string('lastName', 320);
    t.string('middleName', 320);
    t.string('birthDate', 16);
    t.string('lastSms', 4);
    t.string('deviceToken', 255);
    t.timestamp('createdAt').defaultTo(knex.fn.now());
    t.timestamp('updatedAt').defaultTo(knex.fn.now());
    t.timestamp('deletedAt');
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTableIfExists(tableName);
}