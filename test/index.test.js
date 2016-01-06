// jshint expr:true

import { expect } from 'chai';
import { base, orm, example } from 'feathers-service-tests';
import Sequelize from 'sequelize';
import errors from 'feathers-errors';
import feathers from 'feathers';
import service from '../src';
import server from '../example/app';

const sequelize = new Sequelize('sequelize', '', '', {
  dialect: 'sqlite',
  storage: './db.sqlite',
  logging: false
});
const Model = sequelize.define('user', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
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

describe('Feathers Sequelize Service', () => {
  describe('Initialization', () => {
    describe('when missing options', () => {
      it('throws an error', () => {
        expect(service.bind(null)).to.throw('Sequelize options have to be provided');
      });
    });

    describe('when missing a Model', () => {
      it('throws an error', () => {
        expect(service.bind(null, { name: 'Test' })).to.throw(/You must provide a Sequelize Model/);
      });
    });

    describe('when missing the id option', () => {
      it('sets the default to be id', () => {
        expect(people.id).to.equal('id');
      });
    });

    describe('when missing the paginate option', () => {
      it('sets the default to be {}', () => {
        expect(people.paginate).to.deep.equal({});
      });
    });
  });

  describe('Common functionality', () => {
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

    base(people, _ids, errors);
  });
});

describe('Sequelize service ORM errors', () => {
  orm(people, _ids, errors);
});

describe('Sequelize service example test', () => {
  after(done => server.close(() => done()));

  example();
});
