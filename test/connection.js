const Sequelize = require('sequelize');

module.exports = (DB) => {
  if (DB === 'postgres') {
    return new Sequelize('sequelize', 'postgres', 'password', {
      host: 'localhost',
      dialect: 'postgres'
    });
  } else if (DB === 'mysql') {
    return new Sequelize('sequelize', 'root', '', {
      host: '127.0.0.1',
      dialect: 'mysql'
    });
  } else {
    return new Sequelize('sequelize', '', '', {
      dialect: 'sqlite',
      storage: './db.sqlite',
      logging: false
    });
  }
};
