import { Sequelize } from 'sequelize';

export default (DB?: 'postgres' | 'mysql', schema = 'default') => {
  if (DB === 'postgres') {
    return new Sequelize('sequelize', 'postgres', 'password', {
      host: 'localhost',
      dialect: 'postgres',
      schema
    });
  } else if (DB === 'mysql') {
    return new Sequelize('sequelize', 'root', '', {
      host: '127.0.0.1',
      dialect: 'mysql',
      schema
    });
  } else {
    return new Sequelize('sequelize', '', '', {
      dialect: 'sqlite',
      storage: './db.sqlite',
      logging: false,
      schema
    });
  }
};
