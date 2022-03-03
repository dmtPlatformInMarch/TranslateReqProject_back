const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.Users = require('./users')(sequelize, Sequelize);
db.Files = require('./files')(sequelize, Sequelize);
db.Requests = require('./requests')(sequelize, Sequelize);
db.Fileinfos = require('./fileinfos')(sequelize, Sequelize);

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
