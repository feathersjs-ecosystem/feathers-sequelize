// jshint expr:true

import baseTests from 'feathers-service-tests';
import Sequelize from 'sequelize';
import errors from 'feathers-errors';
import service from '../src';

describe('Feathers Sequelize Service', () => {
  const sequelize = new Sequelize('sequelize', null, null, {
    dialect: 'sqlite',
    storage: './db.sqlite',
    logging: false
  });
  const Person = sequelize.define('user', {
    name: {
      type: Sequelize.STRING
    },
    age: {
      type: Sequelize.INTEGER
    }
  }, {
    freezeTableName: true
  });
  const _ids = {};
  const people = service(Person);

  beforeEach(done => {
    Person.sync({ force: true }).then(() => {
      return Person.create({
        name: 'Doug',
        age: 32
      });
    }).then(user => {
      _ids.Doug = user.id;
      done();
    });
  });

  baseTests(people, _ids, errors.types);
});
