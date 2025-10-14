import type { Knex } from 'knex';

const tableName = 'order_request';

export async function up(knex: Knex) {
  const orderType = ['TAXI', 'DELIVERY', 'INTERCITY_TAXI', 'CARGO'];
  const orderStatus = ['CREATED', 'STARTED', 'WAITING', 'ONGOING', 'COMPLETED', 'REJECTED', 'REJECTED_BY_CLIENT', 'REJECTED_BY_DRIVER'];

  return knex.schema.createTable(tableName, async (t) => {
    t.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    t.uuid('driverId').index().references('id').inTable('users').onDelete('cascade').onUpdate('cascade');
    t.uuid('clientId').index().notNullable().references('id').inTable('users').onDelete('cascade').onUpdate('cascade');
    t.enum('orderType', orderType).notNullable().defaultTo('TAXI');
    t.enum('orderStatus', orderStatus).notNullable().defaultTo('CREATED');
    t.string('from', 255).notNullable();
    t.string('to', 255).notNullable();
    t.string('fromMapboxId', 255);
    t.string('toMapboxId', 255);
    t.float('lat', 14, 10);
    t.float('lng', 14, 10);
    t.integer('price', 10);
    t.string('comment');
    t.string('rejectReason');
    t.integer('rating');
    t.timestamp('startTime');
    t.timestamp('arrivalTime');
    t.timestamp('endedAt');
    t.timestamp('createdAt').defaultTo(knex.fn.now());
    t.timestamp('updatedAt').defaultTo(knex.fn.now());
    t.timestamp('deletedAt');
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTableIfExists(tableName);
}