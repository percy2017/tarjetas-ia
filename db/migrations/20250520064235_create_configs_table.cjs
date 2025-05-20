/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('configs', function(table) {
    table.increments('id').primary();
    table.string('section_key').notNullable().unique();
    table.string('section_title').notNullable();
    table.integer('display_order').notNullable().defaultTo(0);
    table.jsonb('fields_config_json').notNullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('configs');
};
