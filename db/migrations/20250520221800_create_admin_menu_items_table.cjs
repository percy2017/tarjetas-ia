/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('admin_menu_items', function(table) {
    table.increments('id').primary();
    table.string('title', 255).notNullable();
    table.string('path', 255).notNullable();
    // Almacenar roles como un array JSON. Ej: ["admin", "client"]
    // Para MySQL, si no soporta JSON nativo de forma eficiente o se usa una versión antigua,
    // se podría usar TEXT y guardar el JSON como string, parseándolo en la app.
    // Pero Knex maneja bien json/jsonb para Postgres, y json para MySQL >= 5.7.8
    table.jsonb('roles').notNullable().defaultTo(JSON.stringify([])); 
    table.integer('display_order').notNullable().defaultTo(0);
    table.string('icon_class', 100).nullable();
    table.integer('parent_id').unsigned().nullable().references('id').inTable('admin_menu_items').onDelete('SET NULL').onUpdate('CASCADE');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('admin_menu_items');
};
