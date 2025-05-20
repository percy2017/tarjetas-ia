// Contenido para db/migrations/20250520051525_create_users_table.cjs
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('username', 255).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 255).nullable();
    table.string('last_name', 255).nullable();
    table.string('phone', 50).nullable();
    table.string('avatar_url', 500).nullable();
    table.string('role', 50).notNullable().defaultTo('customer'); // Nueva columna para el rol
    table.integer('tokens_used').unsigned().notNullable().defaultTo(0);
    table.string('profile_slug').unique().nullable();
    table.timestamps(true, true); // created_at y updated_at
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
