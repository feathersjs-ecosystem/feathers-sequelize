const Sequelize = require('sequelize');

if (process.env.DB === 'postgres') {
  module.exports = new Sequelize('sequelize', 'postgres', '', {
    host: 'localhost',
    dialect: 'postgres'
  });
} else if (process.env.DB === 'mysql') {
  module.exports = new Sequelize('sequelize', 'root', '', {
    host: '127.0.0.1',
    dialect: 'mysql'
  });
} else {
  module.exports = new Sequelize('sequelize', '', '', {
    dialect: 'sqlite',
    storage: './db.sqlite',
    logging: false
  });
}
