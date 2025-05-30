import type { Knex } from 'knex';

const tableName = 'order_requests';

export async function up(knex: Knex) {
  return knex.schema.alterTable(tableName, (t) => {
    t.string('fromMapboxId').nullable();
    t.string('toMapboxId').nullable();
  });
}

export async function down(knex: Knex) {
  return knex.schema.alterTable(tableName, (t) => {
    t.dropColumn('fromMapboxId');
    t.dropColumn('toMapboxId');
  });
} 