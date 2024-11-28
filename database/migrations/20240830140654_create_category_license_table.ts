import type { Knex } from 'knex';

const tableName = 'category_license';
const orderType = ['TAXI', 'DELIVERY', 'INTERCITY_TAXI', 'CARGO'];

export async function up(knex: Knex) {
  return knex.schema.createTableIfNotExists(tableName, (t) => {
    t.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    t.uuid('driverId').index().notNullable().references('id').inTable('users').onDelete('cascade').onUpdate('cascade');
    t.enum('categoryType', orderType).notNullable()
    t.text('brand')
    t.text('model')
    t.text('number')
    t.text('color')
    t.text('SSN')
    t.timestamp('createdAt').defaultTo(knex.fn.now());
    t.timestamp('updatedAt').defaultTo(knex.fn.now());
    t.timestamp('deletedAt');
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable(tableName);
}
