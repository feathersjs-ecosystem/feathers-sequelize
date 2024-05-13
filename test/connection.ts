import type { Options } from 'sequelize';
import { Sequelize } from 'sequelize';

export default (DB?: 'postgres' | 'mysql' | string) => {
  const logging: Options['logging'] = false;

  console.log('DB:', DB);

  if (DB === 'postgres') {
    return new Sequelize(
      process.env.POSTGRES_DB ?? 'sequelize',
      process.env.POSTGRES_USER ?? 'postgres',
      process.env.POSTGRES_PASSWORD ?? 'password',
      {
        host: 'localhost',
        dialect: 'postgres',
        logging
      }
    );
  } else if (DB === 'mysql') {
    return new Sequelize(
      process.env.MYSQl_DATABASE ?? 'sequelize',
      process.env.MYSQL_USER ?? 'root',
      process.env.MYSQL_PASSWORD ?? '',
      {
        host: '127.0.0.1',
        dialect: 'mysql',
        logging
      }
    );
  } else {
    return new Sequelize('sequelize', '', '', {
      dialect: 'sqlite',
      storage: './db.sqlite',
      logging
    });
  }
};
