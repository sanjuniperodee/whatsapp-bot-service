import type { Knex } from 'knex';

const tableName = 'order_request';

export async function up(knex: Knex) {
  const orderType = ['TAXI', 'DELIVERY', 'INTERCITY_TAXI', 'CARGO'];

  return knex.schema.createTableIfNotExists(tableName, async (t) => {
    t.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    t.uuid('driverId').index().notNullable().references('id').inTable('users').onDelete('cascade').onUpdate('cascade');
    t.enum('orderType', orderType).notNullable();
    t.string('sessionId', 16).index();
    t.string('from', 255).notNullable();
    t.string('to', 255).notNullable();
    t.timestamp('startTime');
    t.timestamp('arrivalTime');
    t.float('lat', 14, 10);
    t.float('lng', 14, 10);
    t.string('comment');
    t.timestamp('createdAt').defaultTo(knex.fn.now());
    t.timestamp('updatedAt').defaultTo(knex.fn.now());
    t.timestamp('deletedAt');
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTableIfExists(tableName);
}