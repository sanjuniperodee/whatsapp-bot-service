import type { Knex } from 'knex';

const tableName = 'users';

export async function up(knex: Knex) {
  const hasTagColumn = await knex.schema.hasColumn(tableName, 'deviceToken');
  if (!hasTagColumn)
    return knex.schema.alterTable(tableName, (t) => {
      t.string('deviceToken').nullable();
    });
}

export async function down(knex: Knex) {
  const hasTagColumn = await knex.schema.hasColumn(tableName, 'deviceToken');
  if (hasTagColumn)
    return knex.schema.alterTable(tableName, (t) => {
      t.dropColumn('deviceToken');
    });
}
