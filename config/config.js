const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  "development": {
    "databases": {
      "company_log" : {
        "username": "root",
        "password": "gksqjatn78!",
        "database": "company-log",
        "host": "127.0.0.1",
        "dialect": "mysql"
      },
      
      "mainDB": {
        "username": "root",
        "password": "gksqjatn78!",
        "database": "DMT-database",
        "host": "127.0.0.1",
        "dialect": "mysql"
      }
    }
  },
  "test": {
    "username": process.env.DB_USER,
    "password": process.env.DB_PASSWORD,
    "database": "DMTdatabase",
    "host": process.env.DB_HOST,
    "dialect": "mysql"
  },
  "production": {
    "databases": {
      "company_log" : {
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": "companyLog",
        "host": process.env.DB_HOST,
        "dialect": "mysql"
      },

      "mainDB": {
        "username": process.env.DB_USER,
        "password": process.env.DB_PASSWORD,
        "database": "DMTdatabase",
        "host": process.env.DB_HOST,
        "dialect": "mysql"
      }
    }
    
  }
}
