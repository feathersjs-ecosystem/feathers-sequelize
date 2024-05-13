import type { Options } from 'sequelize';
import { Sequelize } from 'sequelize';

export default (DB?: 'postgres' | 'mysql' | string) => {
  const logging: Options['logging'] = false;

  if (DB === 'postgres') {
    return new Sequelize('sequelize', 'postgres', 'password', {
      host: 'localhost',
      dialect: 'postgres',
      logging
    });
  } else if (DB === 'mysql') {
    return new Sequelize('sequelize', 'root', '', {
      host: '127.0.0.1',
      dialect: 'mysql',
      logging
    });
  } else {
    return new Sequelize('sequelize', '', '', {
      dialect: 'sqlite',
      storage: './db.sqlite',
      logging
    });
  }
};
