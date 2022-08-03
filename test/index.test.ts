/* eslint-disable no-unused-expressions */

import pg from 'pg';
import assert from 'assert';
import { expect } from 'chai';

import Sequelize from 'sequelize';
import errors from '@feathersjs/errors';
import feathers from '@feathersjs/feathers';
import adaptertests from '@feathersjs/adapter-tests';

import service, { Service, hooks, ERROR } from '../src';
import makeConnection from './connection';
const testSuite = adaptertests([
  '.options',
  '.events',
  '._get',
  '._find',
  '._create',
  '._update',
  '._patch',
  '._remove',
  '.get',
  '.get + $select',
  '.get + id + query',
  '.get + NotFound',
  '.find',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  '.remove + multi',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + query + NotFound',
  '.update + NotFound',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch multi query same',
  '.patch multi query changed',
  '.patch + query + NotFound',
  '.patch + NotFound',
  '.create',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params',
  '.remove + id + query id',
  '.update + id + query id',
  '.patch + id + query id',
  '.get + id + query id'
]);

// The base tests require the use of Sequelize.BIGINT to avoid 'out of range errors'
// Unfortunetly BIGINT's are serialized as Strings:
// https://github.com/sequelize/sequelize/issues/1774
pg.defaults.parseInt8 = true;

const sequelize = makeConnection();

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
    type: Sequelize.BIGINT
  },
  status: {
    type: Sequelize.STRING,
    defaultValue: 'pending'
  }
}, {
  freezeTableName: true,
  scopes: {
    active: {
      where: {
        status: 'active'
      }
    },
    pending: {
      where: {
        status: 'pending'
      }
    }
  }
});
const Order = sequelize.define('orders', {
  name: {
    type: Sequelize.STRING,
    allowNull: false
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
    type: Sequelize.BIGINT
  }
}, {
  freezeTableName: true
});
const CustomGetterSetter = sequelize.define('custom-getter-setter', {
  addsOneOnSet: {
    type: Sequelize.INTEGER,
    set (val: any) {
      this.setDataValue('addsOneOnSet', val + 1);
    }
  },
  addsOneOnGet: {
    type: Sequelize.INTEGER,
    get () {
      return this.getDataValue('addsOneOnGet') + 1;
    }
  }
}, {
  freezeTableName: true
});
Model.hasMany(Order);
Order.belongsTo(Model);

describe('Feathers Sequelize Service', () => {
  before(async () => {
    await Model.sync({ force: true });

    await CustomId.sync({ force: true });
    await CustomGetterSetter.sync({ force: true });
    await Order.sync({ force: true });
  });

  describe('Initialization', () => {
    it('throws an error when missing a Model', () => {
      // @ts-ignore
      expect(service.bind(null, { name: 'Test' })).to.throw(/You must provide a Sequelize Model/);
    });

    it('re-exports hooks', () => {
      assert.ok(hooks);
    });
  });

  describe('Common Tests', () => {
    const app = feathers()
      .use('/people', service({
        Model,
        events: ['testing']
      }))
      .use('/people-customid', service({
        Model: CustomId,
        events: ['testing']
      }));

    it('has .Model', () => {
      assert.ok(app.service('people').Model);
    });

    testSuite(app, errors, 'people', 'id');
    testSuite(app, errors, 'people-customid', 'customid');
  });

  describe('Feathers-Sequelize Specific Tests', () => {
    const app = feathers()
      .use('/people', service({
        Model,
        paginate: {
          default: 10
        },
        events: ['testing'],
        multi: true
      }))
      .use('/orders', service({
        Model: Order,
        multi: true
      }))
      .use('/custom-getter-setter', service({
        Model: CustomGetterSetter,
        events: ['testing'],
        multi: true
      }));

    before(() => app.service('people')
      .remove(null, { query: { $limit: 1000 } })
    );

    after(() => app.service('people')
      .remove(null, { query: { $limit: 1000 } })
    );

    describe('Common functionality', () => {
      const people = app.service('people');
      let kirsten: any;

      beforeEach(async () => {
        kirsten = await people.create({ name: 'Kirsten', age: 30 });
      });

      afterEach(() => people.remove(kirsten.id).catch(() => {}));

      it('allows querying for null values (#45)', async () => {
        const name = 'Null test';
        const person = await people.create({ name });
        const { data } = await people.find({ query: { age: null } });

        assert.strictEqual(data.length, 1);
        assert.strictEqual(data[0].name, name);
        assert.strictEqual(data[0].age, null);

        await people.remove(person.id);
      });

      it('cleans up the query prototype', async () => {
        const page = await people.find({
          query: {
            name: 'Dave',
            __proto__: []
          }
        });

        assert.strictEqual(page.data.length, 0);
      });

      it('still allows querying with Sequelize operators', async () => {
        const name = 'Age test';
        const person = await people.create({ name, age: 10 });
        const { data } = await people.find({
          query:
          { age: { [Sequelize.Op.eq]: 10 } }
        });

        assert.strictEqual(data.length, 1);
        assert.strictEqual(data[0].name, name);
        assert.strictEqual(data[0].age, 10);

        await people.remove(person.id);
      });

      it('$like works', async () => {
        const name = 'Like test';
        const person = await people.create({ name, age: 10 });
        const { data } = await people.find({
          query:
          { name: { $like: '%ike%' } }
        });

        assert.strictEqual(data.length, 1);
        assert.strictEqual(data[0].name, name);
        assert.strictEqual(data[0].age, 10);

        await people.remove(person.id);
      });

      it('does not allow raw attribute $select ', async () => {
        await assert.rejects(() => people.find({
          query: { $select: [['(sqlite_version())', 'x']] }
        }));
      });

      it('hides the Sequelize error in ERROR symbol', async () => {
        try {
          await people.create({
            age: 10
          });
          assert.ok(false, 'Should never get here');
        } catch (error: any) {
          assert.ok(error[ERROR]);
          assert.strictEqual(error.name, 'BadRequest');
        }
      });

      it('correctly persists updates (#125)', async () => {
        const updateName = 'Ryan';

        await people.update(kirsten.id, { name: updateName });

        const updatedPerson = await people.get(kirsten.id);

        assert.strictEqual(updatedPerson.name, updateName);
      });

      it('correctly updates records using optional query param', async () => {
        const updateAge = 40;
        const updateName = 'Kirtsten';

        await people.update(kirsten.id, { name: updateName, age: updateAge }, {
          query: { name: 'Kirsten' }
        });

        const updatedPerson = await people.get(kirsten.id);

        assert.strictEqual(updatedPerson.age, updateAge);
      });

      it('fails update when query prevents result in no record match for id', async () => {
        const updateAge = 50;
        const updateName = 'Kirtsten';

        try {
          await people.update(kirsten.id, { name: updateName, age: updateAge }, {
            query: { name: 'John' }
          });
          assert.ok(false, 'Should never get here');
        } catch (error: any) {
          assert(error.message.indexOf('No record found') >= 0);
        }
      });

      it('filterQuery does not convert dates and symbols', () => {
        const mySymbol = Symbol('test');
        const date = new Date();
        const query = {
          test: { sub: date },
          [mySymbol]: 'hello'
        };
        const filtered = app.service('people').filterQuery({ query });

        assert.deepStrictEqual(filtered.query, query);
      });

      it('get works with custom $and', async () => {
        let johnId;
        try {
          const john = await people.create({ name: 'John', age: 30 });
          johnId = john.id;
          const foundJohn = await people.get(john.id, { query: { $and: [{ age: 30 }, { status: 'pending' }] } });
          assert.strictEqual(foundJohn.id, john.id);
        } finally {
          if (johnId) {
            await people.remove(johnId);
          }
        }
      });
    });

    describe('Association Tests', () => {
      const people = app.service('people');
      const orders = app.service('orders');
      let kirsten: any; let ryan: any;

      beforeEach(async () => {
        kirsten = await people.create({ name: 'Kirsten', age: 30 });

        await orders.create([
          { name: 'Order 1', personId: kirsten.id },
          { name: 'Order 2', personId: kirsten.id },
          { name: 'Order 3', personId: kirsten.id }
        ]);

        ryan = await people.create({ name: 'Ryan', age: 30 });
        await orders.create([
          { name: 'Order 4', personId: ryan.id },
          { name: 'Order 5', personId: ryan.id },
          { name: 'Order 6', personId: ryan.id }
        ]);
      });

      afterEach(() =>
        orders.remove(null, { query: { $limit: 1000 } })
          .then(() => people.remove(kirsten.id))
          .then(() => people.remove(ryan.id))
          .catch(() => {})
      );

      it('find() returns correct total when using includes for non-raw requests (#137)', async () => {
        const options = { sequelize: { raw: false, include: Order } };

        const result = await people.find(options);

        assert.strictEqual(result.total, 2);
      });

      it('find() returns correct total when using includes for raw requests', async () => {
        const options = { sequelize: { include: Order } };

        const result = await people.find(options);

        assert.strictEqual(result.total, 2);
      });

      it('patch() includes associations', async () => {
        const params = { sequelize: { include: Order } };
        const data = { name: 'Patched' };

        const result = await people.patch(kirsten.id, data, params);

        expect(result).to.have.property('orders.id');
      });

      it('update() includes associations', async () => {
        const params = { sequelize: { include: Order } };
        const data = { name: 'Updated' };

        const result = await people.update(kirsten.id, data, params);

        expect(result).to.have.property('orders.id');
      });

      it('remove() includes associations', async () => {
        const params = { sequelize: { include: Order } };

        const result = await people.remove(kirsten.id, params);

        expect(result).to.have.property('orders.id');

        kirsten = await people.create({ name: 'Kirsten', age: 30 });
      });
    });

    describe('Custom getters and setters', () => {
      it('calls custom getters and setters (#113)', async () => {
        const value = 0;
        const service = app.service('custom-getter-setter');
        const data = { addsOneOnGet: value, addsOneOnSet: value };
        const result = await service.create(data);

        assert.strictEqual(result.addsOneOnGet, value + 1);
        assert.strictEqual(result.addsOneOnSet, value + 1);
      });

      it('can ignore custom getters and setters (#113)', async () => {
        const value = 0;
        const service = app.service('custom-getter-setter');
        const data = { addsOneOnGet: value, addsOneOnSet: value };
        const IGNORE_SETTERS = { sequelize: { ignoreSetters: true } };
        const result = await service.create(data, IGNORE_SETTERS);

        assert.strictEqual(result.addsOneOnGet, value + 1);
        assert.strictEqual(result.addsOneOnSet, value);
      });
    });

    describe('Operators and Whitelist', () => {
      it('merges whitelist and default operators', async () => {
        const app = feathers();
        const whitelist = ['$something'];
        app.use('/ops-and-whitelist', service({
          Model,
          whitelist
        }));
        const ops = app.service('ops-and-whitelist');
        const newWhitelist = Object
          .keys(ops.options.operators)
          .concat(whitelist);
        expect(newWhitelist).to.deep.equal(ops.options.whitelist);
      });

      it('fails using operator that IS NOT whitelisted OR default', async () => {
        const app = feathers();
        app.use('/ops-and-whitelist', service({
          Model
        }));
        const ops = app.service('ops-and-whitelist');
        try {
          await ops.find({ query: { name: { $notWhitelisted: 'Beau' } } });
          assert.ok(false, 'Should never get here');
        } catch (error: any) {
          assert.strictEqual(error.name, 'BadRequest');
          assert.strictEqual(error.message, 'Invalid query parameter $notWhitelisted');
        }
      });

      it('succeeds using operator that IS whitelisted OR default', async () => {
        const app = feathers();
        app.use('/ops-and-whitelist', service({
          Model,
          whitelist: ['$between'],
          operators: { $between: Sequelize.Op.between }
        }));
        const ops = app.service('ops-and-whitelist');
        await ops.find({ query: { name: { $like: 'Beau' } } });
      });

      it('succeeds using operator that IS whitelisted AND default', async () => {
        const app = feathers();
        app.use('/ops-and-whitelist', service({
          Model,
          whitelist: ['$like']
        }));
        const ops = app.service('ops-and-whitelist');
        await ops.find({ query: { name: { $like: 'Beau' } } });
      });

      it('fails using an invalid operator in the whitelist', async () => {
        const app = feathers();
        app.use('/ops-and-whitelist', service({
          Model,
          whitelist: ['$invalidOp']
        }));
        const ops = app.service('ops-and-whitelist');
        try {
          await ops.find({ query: { name: { $invalidOp: 'Beau' } } });
          assert.ok(false, 'Should never get here');
        } catch (error: any) {
          assert.strictEqual(error.message, 'Invalid value { \'$invalidOp\': \'Beau\' }');
        }
      });
    });

    it('can set the scope of an operation#130', async () => {
      const people = app.service('people');
      const data = { name: 'Active', status: 'active' };
      const SCOPE_TO_ACTIVE = { sequelize: { scope: 'active' } };
      const SCOPE_TO_PENDING = { sequelize: { scope: 'pending' } };
      const person = await people.create(data);

      const staPeople = await people.find(SCOPE_TO_ACTIVE);
      assert.strictEqual(staPeople.data.length, 1);

      const stpPeople = await people.find(SCOPE_TO_PENDING);
      assert.strictEqual(stpPeople.data.length, 0);

      await people.remove(person.id);
    });
  });

  describe('ORM functionality', () => {
    const app = feathers();
    app.use('/raw-people', service({
      Model,
      events: ['testing'],
      multi: true
    }));
    const rawPeople = app.service('raw-people');

    describe('Non-raw Service Config', () => {
      app.use('/people', service({
        Model,
        events: ['testing'],
        multi: true,
        raw: false // -> this is what we are testing
      }));
      const people = app.service('people');
      let david: any;

      beforeEach(async () => {
        david = await people.create({ name: 'David' });
      });

      afterEach(() => people.remove(david.id).catch(() => {}));

      it('find() returns model instances', async () => {
        const results = await people.find();

        expect(results[0]).to.be.an.instanceof(Model);
      });

      it('get() returns a model instance', async () => {
        const instance = await people.get(david.id);

        expect(instance).to.be.an.instanceOf(Model);
      });

      it('create() returns a model instance', async () => {
        const instance = await people.create({ name: 'Sarah' });

        expect(instance).to.be.an.instanceOf(Model);

        await people.remove(instance.id);
      });

      it('bulk create() returns model instances', async () => {
        const results = await people.create([
          { name: 'Sarah' },
          { name: 'Connor' }
        ]);

        expect(results.length).to.equal(2);
        expect(results[0]).to.be.an.instanceOf(Model);
        assert.ok(results[0].id);
        assert.ok(results[1].id);

        await people.remove(results[0].id);
        await people.remove(results[1].id);
      });

      it('patch() returns a model instance', async () => {
        const instance = await people.patch(david.id, { name: 'Sarah' });

        expect(instance).to.be.an.instanceOf(Model);
      });

      it('patch() with $returning=false returns empty array', async () => {
        const response = await people.patch(david.id, { name: 'Sarah' }, { $returning: false });

        expect(response).to.deep.equal([]);
      });

      it('update() returns a model instance', async () => {
        const instance = await people.update(david.id, david);

        expect(instance).to.be.an.instanceOf(Model);
      });

      it('remove() returns a model instance', async () => {
        const instance = await people.remove(david.id);

        expect(instance).to.be.an.instanceOf(Model);
      });

      it('remove() with $returning=false returns empty array', async () => {
        const response = await people.remove(david.id, { $returning: false });

        expect(response).to.deep.equal([]);
      });
    });

    describe('Non-raw Service Method Calls', () => {
      const NOT_RAW = { sequelize: { raw: false } };
      let david: any;

      beforeEach(async () => {
        david = await rawPeople.create({ name: 'David' });
      });

      afterEach(() => rawPeople.remove(david.id).catch(() => {}));

      it('`raw: false` works for find()', async () => {
        const results = await rawPeople.find(NOT_RAW);

        expect(results[0]).to.be.an.instanceof(Model);
      });

      it('`raw: false` works for get()', async () => {
        const instance = await rawPeople.get(david.id, NOT_RAW);

        expect(instance).to.be.an.instanceof(Model);
      });

      it('`raw: false` works for create()', async () => {
        const instance = await rawPeople.create({ name: 'Sarah' }, NOT_RAW);

        expect(instance).to.be.an.instanceof(Model);

        await rawPeople.remove(instance.id);
      });

      it('`raw: false` works for bulk create()', async () => {
        const results = await rawPeople.create([{ name: 'Sarah' }], NOT_RAW);

        expect(results.length).to.equal(1);
        expect(results[0]).to.be.an.instanceof(Model);

        await rawPeople.remove(results[0].id);
      });

      it('`raw: false` works for patch()', async () => {
        const instance = await rawPeople.patch(david.id, { name: 'Sarah' }, NOT_RAW);

        expect(instance).to.be.an.instanceof(Model);
      });

      it('`raw: false` works for update()', async () => {
        const instance = await rawPeople.update(david.id, david, NOT_RAW);

        expect(instance).to.be.an.instanceof(Model);
      });

      it('`raw: false` works for remove()', async () => {
        const instance = await rawPeople.remove(david.id, NOT_RAW);

        expect(instance).to.be.an.instanceof(Model);
      });
    });
  });

  describe('ORM functionality with overidden getModel method', () => {
    const EXPECTED_ATTRIBUTE_VALUE = 42;

    function getExtraParams (
      additionalTopLevelParams: Record<string, any> = {},
      additionalSequelizeParams: Record<string, any> = {}
    ) {
      return Object.assign({
        sequelize: Object.assign({
          expectedAttribute: EXPECTED_ATTRIBUTE_VALUE,
          getModelCalls: { count: 0 }
        }, additionalSequelizeParams)
      }, additionalTopLevelParams);
    }

    class ExtendedService extends Service {
      getModel (params: any) {
        if (!params.sequelize || params.sequelize.expectedAttribute !== EXPECTED_ATTRIBUTE_VALUE) {
          throw new Error('Expected custom attribute not found in overridden getModel()!');
        }

        if (params.sequelize.getModelCalls === undefined) {
          throw new Error('getModelCalls not defined on params.sequelize!');
        }

        params.sequelize.getModelCalls.count++;

        return this.options.Model;
      }

      get Model () {
        // Extended service classes that override getModel will often
        // depend upon having certain params provided from further up
        // the call stack (e.g. part of the request object to make a decision
        // on which model/db to return based on the hostname being accessed).
        // If feathers-sequelize wants access to the model, it should always
        // call getModel(params).
        // Returning null here is a way to ensure that a regression isn't
        // introduced later whereby feathers-sequelize attempts to access a
        // model obtained via the Model getter rather than via getModel(params).
        return null as any;
      }
    }

    function extendedService (options: any) {
      return new ExtendedService(options);
    }

    const app = feathers();
    app.use('/raw-people', extendedService({
      Model,
      events: ['testing'],
      multi: true
    }));
    const rawPeople = app.service('raw-people');

    describe('Non-raw Service Config', () => {
      app.use('/people', extendedService({
        Model,
        events: ['testing'],
        multi: true,
        raw: false // -> this is what we are testing
      }));
      const people = app.service('people');
      let david: any;

      beforeEach(async () => {
        david = await people.create({ name: 'David' }, getExtraParams());
      });

      afterEach(() => people.remove(david.id, getExtraParams()).catch(() => {}));

      it('find() returns model instances', async () => {
        const params = getExtraParams();
        const results = await people.find(params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(results[0]).to.be.an.instanceof(Model);
      });

      it('get() returns a model instance', async () => {
        const params = getExtraParams();
        const instance = await people.get(david.id, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);
        expect(instance).to.be.an.instanceof(Model);
      });

      it('create() returns a model instance', async () => {
        const params = getExtraParams();
        const instance = await people.create({ name: 'Sarah' }, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(instance).to.be.an.instanceof(Model);

        const removeParams = getExtraParams();
        await people.remove(instance.id, removeParams);
        expect(removeParams.sequelize.getModelCalls.count).to.gte(1);
      });

      it('bulk create() returns model instances', async () => {
        const params = getExtraParams();
        const results = await people.create([{ name: 'Sarah' }], params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(results.length).to.equal(1);
        expect(results[0]).to.be.an.instanceof(Model);

        const removeParams = getExtraParams();
        await people.remove(results[0].id, removeParams);
        expect(removeParams.sequelize.getModelCalls.count).to.gte(1);
      });

      it('patch() returns a model instance', async () => {
        const params = getExtraParams();
        const instance = await people.patch(david.id, { name: 'Sarah' }, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);
        expect(instance).to.be.an.instanceof(Model);
      });

      it('patch() with $returning=false returns empty array', async () => {
        const params = getExtraParams({ $returning: false });
        const response = await people.patch(david.id, { name: 'Sarah' }, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(response).to.deep.equal([]);
      });

      it('update() returns a model instance', async () => {
        const params = getExtraParams();
        const instance = await people.update(david.id, david, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);
        expect(instance).to.be.an.instanceof(Model);
      });

      it('remove() returns a model instance', async () => {
        const params = getExtraParams();
        const instance = await people.remove(david.id, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(instance).to.be.an.instanceof(Model);
      });

      it('remove() with $returning=false returns empty array', async () => {
        const params = getExtraParams({ $returning: false });
        const response = await people.remove(david.id, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(response).to.deep.equal([]);
      });
    });

    describe('Non-raw Service Method Calls', () => {
      const NOT_RAW = { raw: false };

      let david: any;

      beforeEach(async () => {
        david = await rawPeople.create({ name: 'David' }, getExtraParams());
      });

      afterEach(() => rawPeople.remove(david.id, getExtraParams()).catch(() => {}));

      it('`raw: false` works for find()', async () => {
        const params = getExtraParams({}, NOT_RAW);
        const results = await rawPeople.find(params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(results[0]).to.be.an.instanceof(Model);
      });

      it('`raw: false` works for get()', async () => {
        const params = getExtraParams({}, NOT_RAW);
        const instance = await rawPeople.get(david.id, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(instance).to.be.an.instanceof(Model);
      });

      it('`raw: false` works for create()', async () => {
        const params = getExtraParams({}, NOT_RAW);
        const instance = await rawPeople.create({ name: 'Sarah' }, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(instance).to.be.an.instanceof(Model);

        const removeParams = getExtraParams();
        await rawPeople.remove(instance.id, removeParams);
        expect(removeParams.sequelize.getModelCalls.count).to.gte(1);
      });

      it('`raw: false` works for bulk create()', async () => {
        const params = getExtraParams({}, NOT_RAW);
        const results = await rawPeople.create([{ name: 'Sarah' }], params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(results.length).to.equal(1);
        expect(results[0]).to.be.an.instanceof(Model);

        const removeParams = getExtraParams();
        await rawPeople.remove(results[0].id, removeParams);
        expect(removeParams.sequelize.getModelCalls.count).to.gte(1);
      });

      it('`raw: false` works for patch()', async () => {
        const params = getExtraParams({}, NOT_RAW);
        const instance = await rawPeople.patch(david.id, { name: 'Sarah' }, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(instance).to.be.an.instanceof(Model);
      });

      it('`raw: false` works for update()', async () => {
        const params = getExtraParams({}, NOT_RAW);
        const instance = await rawPeople.update(david.id, david, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(instance).to.be.an.instanceof(Model);
      });

      it('`raw: false` works for remove()', async () => {
        const params = getExtraParams({}, NOT_RAW);
        const instance = await rawPeople.remove(david.id, params);
        expect(params.sequelize.getModelCalls.count).to.gte(1);

        expect(instance).to.be.an.instanceof(Model);
      });
    });
  });
});
