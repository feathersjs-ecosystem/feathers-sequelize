const Sequelize = require('sequelize');

module.exports = (DB) => {
  const operatorsAliases = false;

  if (DB === 'postgres') {
    return new Sequelize('sequelize', 'postgres', '', {
      host: 'localhost',
      dialect: 'postgres',
      operatorsAliases
    });
  } else if (DB === 'mysql') {
    return new Sequelize('sequelize', 'root', '', {
      host: '127.0.0.1',
      dialect: 'mysql',
      operatorsAliases
    });
  } else {
    return new Sequelize('sequelize', '', '', {
      dialect: 'sqlite',
      storage: './db.sqlite',
      logging: false,
      operatorsAliases
    });
  }
};
