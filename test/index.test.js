// jshint expr:true

import { base, example } from 'feathers-service-tests';
import Sequelize from 'sequelize';
import errors from 'feathers-errors';
import feathers from 'feathers';
import service from '../src';
import server from '../example/app';

describe('Feathers Sequelize Service', () => {
  const sequelize = new Sequelize('sequelize', '', '', {
    dialect: 'sqlite',
    storage: './db.sqlite',
    logging: false
  });
  const Model = sequelize.define('user', {
    name: {
      type: Sequelize.STRING
    },
    age: {
      type: Sequelize.INTEGER
    },
    created: {
      type: Sequelize.BOOLEAN
    },
    time: {
      type: Sequelize.INTEGER
    }
  }, {
    freezeTableName: true
  });
  const _ids = {};
  const app = feathers().use('/people', service({ Model }));
  const people = app.service('people');

  beforeEach(done => {
    Model.sync({ force: true }).then(() => {
      return Model.create({
        name: 'Doug',
        age: 32
      });
    }).then(user => {
      _ids.Doug = user.id;
      done();
    });
  });

  base(people, _ids, errors.types);
});

describe('Sequelize service example test', () => {
  after(done => server.close(() => done()));

  example();
});
