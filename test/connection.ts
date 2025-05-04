import type { Options } from 'sequelize'
import { Sequelize } from 'sequelize'

export default (DB?: 'postgres' | 'mysql' | 'mariadb' | (string & {})) => {
  const logging: Options['logging'] = false

  if (DB === 'postgres') {
    return new Sequelize(
      process.env.POSTGRES_DB ?? 'sequelize',
      process.env.POSTGRES_USER ?? 'postgres',
      process.env.POSTGRES_PASSWORD ?? 'password',
      {
        host: 'localhost',
        dialect: 'postgres',
        logging,
      },
    )
  } else if (DB === 'mysql') {
    return new Sequelize(
      process.env.MYSQl_DATABASE ?? 'sequelize',
      process.env.MYSQL_USER ?? 'root',
      process.env.MYSQL_PASSWORD ?? '',
      {
        host: '127.0.0.1',
        dialect: 'mysql',
        logging,
      },
    )
  } else if (DB === 'mariadb') {
    return new Sequelize(
      process.env.MARIADB_DATABASE ?? 'sequelize',
      process.env.MARIADB_USER ?? 'sequelize',
      process.env.MARIADB_PASSWORD ?? 'password',
      {
        host: 'localhost',
        port: 3306,
        dialect: 'mariadb',
        logging,
      },
    )
  }

  return new Sequelize('sequelize', '', '', {
    dialect: 'sqlite',
    storage: './db.sqlite',
    logging,
  })
}
