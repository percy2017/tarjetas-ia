// db.cjs
const knex = require('knex');
const knexConfig = require('./knexfile.cjs'); // knexfile.cjs está en la misma raíz

// Determinar el entorno (development, production, etc.)
// Si NODE_ENV no está definido, por defecto será 'development'
const environment = process.env.NODE_ENV || 'development'; 

// Obtener la configuración de Knex para el entorno actual
const config = knexConfig[environment];

if (!config) {
  throw new Error(`Knex configuration for environment '${environment}' not found in knexfile.cjs`);
}

// Crear y exportar la instancia de Knex
module.exports = knex(config);
