// db/seeds/01_create_admin_user.cjs
const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Opcional: Borra entradas existentes para evitar duplicados si corres el seed múltiples veces
  // await knex('users').where({ username: 'admin' }).del(); // Borra solo el admin si ya existe
  // o await knex('users').del(); // Borra TODOS los usuarios (cuidado)

  // Hashear la contraseña
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('admin2025', saltRounds);

  // Inserta el usuario administrador
  await knex('users').insert([
    {
      username: 'admin',
      email: 'admin@example.com', // Cambia esto a un email real si quieres
      password_hash: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      phone: null, // Opcional
      avatar_url: null, // Opcional
      role: 'admin',
      // created_at y updated_at se llenarán automáticamente por timestamps(true, true) en la migración
    }
  ]);

  console.log('Admin user seeded successfully!');
};
