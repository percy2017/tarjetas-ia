// knexfile.cjs
const path = require('path');

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1', // O la IP de tu servidor MySQL si no es local
      user: 'root',
      password: '', // Dejamos vacío como indicaste
      database: 'dbjs'
    },
    migrations: {
      directory: path.resolve(__dirname, 'db/migrations')
    },
    seeds: {
      directory: path.resolve(__dirname, 'db/seeds')
    }
  },

  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    migrations: {
      directory: path.resolve(__dirname, 'db/migrations')
    },
    seeds: {
      directory: path.resolve(__dirname, 'db/seeds')
    }
  }
};
