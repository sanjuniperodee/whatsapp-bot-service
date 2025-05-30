import type { Knex } from 'knex';

const tableName = 'users';

export async function up(knex: Knex) {
  return knex.schema.alterTable(tableName, (t) => {
    t.boolean('isBlocked').defaultTo(false).notNullable();
    t.timestamp('blockedUntil').nullable();
    t.text('blockReason').nullable();
  });
}

export async function down(knex: Knex) {
  return knex.schema.alterTable(tableName, (t) => {
    t.dropColumn('isBlocked');
    t.dropColumn('blockedUntil');
    t.dropColumn('blockReason');
  });
}
