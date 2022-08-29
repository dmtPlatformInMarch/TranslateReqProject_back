const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  "development": {
    "username": "root",
    "password": "gksqjatn78!",
    "database": "DMT-database",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "test": {
    "username": process.env.DB_USER,
    "password": process.env.DB_PASSWORD,
    "database": "DMTdatabase",
    "host": process.env.DB_HOST,
    "dialect": "mysql"
  },
  "production": {
    "username": process.env.DB_USER,
    "password": process.env.DB_PASSWORD,
    "database": "DMTdatabase",
    "host": process.env.DB_HOST,
    "dialect": "mysql"
  }
}
