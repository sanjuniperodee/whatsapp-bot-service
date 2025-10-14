import type { Knex } from 'knex';

export async function up(knex: Knex) {
  // deviceToken field already added in create_users_table migration
}

export async function down(knex: Knex) {
  // deviceToken field already added in create_users_table migration
}
