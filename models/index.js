const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const databases = Object.keys(config.databases);
let db = {};


for (let i = 0; i < databases.length; ++i) {
  let database = databases[i];
  let dbPath = config.databases[database];
  db[database] = new Sequelize(dbPath.database, dbPath.username, dbPath.password, dbPath);
}

db['mainDB'].Users = require('./mainDB/users')(db['mainDB'], Sequelize);
db['mainDB'].Files = require('./mainDB/files')(db['mainDB'], Sequelize);
db['mainDB'].Requests = require('./mainDB/requests')(db['mainDB'], Sequelize);
db['mainDB'].Fileinfos = require('./mainDB/fileinfos')(db['mainDB'], Sequelize);
db['mainDB'].Companys = require('./mainDB/companys')(db['mainDB'], Sequelize);

for (let i = 0; i < databases.length; ++i) {
  Object.keys(db[databases[i]]).forEach(modelName => {
    if (db[databases[i]][modelName].associate) {
      db[databases[i]][modelName].associate(db[databases[i]]);
    }
  });
}

db.mainDB = db['mainDB'];
db.company_log = db['company_log'];
db.Sequelize = Sequelize;

module.exports = db;
