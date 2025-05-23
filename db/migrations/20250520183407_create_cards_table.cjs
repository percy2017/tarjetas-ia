/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('cards', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('title').notNullable();
    table.string('slug').notNullable().unique();
    table.string('file_path').nullable(); // <--- NUEVO CAMPO PARA RUTA DEL ARCHIVO HTML
    table.text('original_prompt').nullable(); 
    table.integer('tokens_cost').nullable().defaultTo(0); // <--- NUEVO CAMPO PARA COSTO DE TOKENS POR TARJETA
    table.enum('status', ['draft', 'published', 'pending', 'trash'], { useNative: true, enumName: 'card_status_type' }).notNullable().defaultTo('draft');
    table.jsonb('content_json').nullable(); // Para guardar HTML, CSS, JS directamente si se decide en el futuro
    table.boolean('is_default').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('cards')
    .then(function () {
      // Si se usa enumName, en algunos dialectos de SQL (como PostgreSQL) se debe eliminar el tipo enum manualmente.
      // Para MySQL, esto no es necesario. Para PostgreSQL, sería:
      // return knex.raw('DROP TYPE IF EXISTS card_status_type;');
      // Por ahora, lo dejamos así ya que MySQL es el objetivo principal.
      return Promise.resolve();
    });
};
