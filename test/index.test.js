import assert from 'assert';
import { expect } from 'chai';
import { base, example, orm } from 'feathers-service-tests';
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
const Model = sequelize.define('people', {
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
const CustomId = sequelize.define('people-customid', {
  customid: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
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

describe('Feathers Sequelize Service', () => {
  before(() =>
    Model.sync({ force: true })
      .then(() => CustomId.sync({ force: true }))
  );

  describe('Initialization', () => {
    it('throws an error when missing options', () => {
      expect(service.bind(null)).to.throw('Sequelize options have to be provided');
    });

    it('throws an error when missing a Model', () => {
      expect(service.bind(null, { name: 'Test' })).to.throw(/You must provide a Sequelize Model/);
    });
  });

  describe('Common functionality', () => {
    const app = feathers()
      .use('/people', service({
        Model,
        events: [ 'testing' ]
      }))
      .use('/people-customid', service({
        Model: CustomId,
        events: [ 'testing' ],
        id: 'customid'
      }));

    it('allows querying for null values (#45)', () => {
      const name = 'Null test';
      const people = app.service('people');

      return people.create({ name }).then(person =>
        people.find({ query: { age: null } }).then(people => {
          assert.equal(people.length, 1);
          assert.equal(people[0].name, name);
          assert.equal(people[0].age, null);
        }).then(() => people.remove(person.id))
      );
    });

    base(app, errors);
    base(app, errors, 'people-customid', 'customid');
  });

  describe('ORM functionality', () => {
    const app = feathers()
      .use('/people', service({
        Model,
        events: [ 'testing' ]
      }));
    const people = app.service('people');

    describe('Model Instance queries', () => {
      const _ids = {};
      const _data = {};

      beforeEach(() =>
        people.create({name: 'David'}).then(result => {
          _data.David = result;
          _ids.David = result.id;
        })
      );

      afterEach(() =>
        people.remove(_ids.David)
      );

      it('`raw: false` works for find()', () =>
        people.find({sequelize: {raw: false}}).then(results =>
          expect(results[0] instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for get()', () =>
        people.get(_ids.David, {sequelize: {raw: false}}).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for create()', () =>
        people.create({name: 'Sarah'}, {sequelize: {raw: false}}).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for bulk create()', () =>
        people.create([{name: 'Sarah'}], {sequelize: {raw: false}}).then(results =>
          expect(results[0] instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for patch()', () =>
        people.patch(_ids.David, {name: 'Sarah'}, {sequelize: {raw: false}}).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for update()', () =>
        people.update(_ids.David, _data.David, {sequelize: {raw: false}}).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );
    });

    orm(people, errors);
  });
});

describe('Sequelize service example test', () => {
  after(done => server.close(() => done()));

  example();
});
