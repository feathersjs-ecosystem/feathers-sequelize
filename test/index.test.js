const pg = require('pg');
const assert = require('assert');
const { expect } = require('chai');

const Sequelize = require('sequelize');
const errors = require('@feathersjs/errors');
const feathers = require('@feathersjs/feathers');
const adaptertests = require('@feathersjs/adapter-commons/tests');

const service = require('../lib');
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
  '.update + NotFound',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch multi query',
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
  '.find + paginate + params'
]);

// The base tests require the use of Sequelize.BIGINT to avoid 'out of range errors'
// Unfortunetly BIGINT's are serialized as Strings:
// https://github.com/sequelize/sequelize/issues/1774
pg.defaults.parseInt8 = true;

const sequelize = require('./connection')();

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
    set: function (val) {
      this.setDataValue('addsOneOnSet', val + 1);
    }
  },
  addsOneOnGet: {
    type: Sequelize.INTEGER,
    get: function () {
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
      expect(service.bind(null, { name: 'Test' })).to.throw(/You must provide a Sequelize Model/);
    });
  });

  describe('Common Tests', () => {
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
        events: [ 'testing' ],
        multi: true
      }))
      .use('/orders', service({
        Model: Order,
        multi: true
      }))
      .use('/custom-getter-setter', service({
        Model: CustomGetterSetter,
        events: [ 'testing' ],
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
      let kirsten;

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

      it('still allows querying with Sequelize operators', async () => {
        const name = 'Age test';
        const person = await people.create({ name, age: 10 });
        const { data } = await people.find({ query:
          { age: { [Sequelize.Op.eq]: 10 } }
        });

        assert.strictEqual(data.length, 1);
        assert.strictEqual(data[0].name, name);
        assert.strictEqual(data[0].age, 10);

        await people.remove(person.id);
      });

      it('hides the Sequelize error in ERROR symbol', async () => {
        try {
          await people.create({
            age: 10
          });
          assert.ok(false, 'Should never get here');
        } catch (error) {
          assert.ok(error[service.ERROR]);
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
        } catch (error) {
          assert(error.message.indexOf('No record found') >= 0);
        }
      });
    });

    describe('Association Tests', () => {
      const people = app.service('people');
      const orders = app.service('orders');
      let kirsten, ryan;

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
      events: [ 'testing' ],
      multi: true
    }));
    const rawPeople = app.service('raw-people');

    describe('Non-raw Service Config', () => {
      app.use('/people', service({
        Model,
        events: [ 'testing' ],
        multi: true,
        raw: false // -> this is what we are testing
      }));
      const people = app.service('people');
      let david;

      beforeEach(async () => {
        david = await people.create({ name: 'David' });
      });

      afterEach(() => people.remove(david.id).catch(() => {}));

      it('find() returns model instances', async () => {
        const results = await people.find();

        expect(results[0] instanceof Model);
      });

      it('get() returns a model instance', async () => {
        const instance = await people.get(david.id);

        expect(instance instanceof Model);
      });

      it('create() returns a model instance', async () => {
        const instance = await people.create({ name: 'Sarah' });

        expect(instance instanceof Model);

        await people.remove(instance.id);
      });

      it('bulk create() returns model instances', async () => {
        const results = await people.create([{ name: 'Sarah' }]);

        expect(results.length).to.equal(1);
        expect(results[0] instanceof Model);

        await people.remove(results[0].id);
      });

      it('patch() returns a model instance', async () => {
        const instance = await people.patch(david.id, { name: 'Sarah' });

        expect(instance instanceof Model);
      });

      it('patch() with $returning=false returns empty array', async () => {
        const response = await people.patch(david.id, { name: 'Sarah' }, { $returning: false });

        expect(response).to.deep.equal([]);
      });

      it('update() returns a model instance', async () => {
        const instance = await people.update(david.id, david);

        expect(instance instanceof Model);
      });

      it('remove() returns a model instance', async () => {
        const instance = await people.remove(david.id);

        expect(instance instanceof Model);
      });

      it('remove() with $returning=false returns empty array', async () => {
        const response = await people.remove(david.id, { $returning: false });

        expect(response).to.deep.equal([]);
      });
    });

    describe('Non-raw Service Method Calls', () => {
      const NOT_RAW = { sequelize: { raw: false } };
      let david;

      beforeEach(async () => {
        david = await rawPeople.create({ name: 'David' });
      });

      afterEach(() => rawPeople.remove(david.id).catch(() => {}));

      it('`raw: false` works for find()', async () => {
        const results = await rawPeople.find(NOT_RAW);

        expect(results[0] instanceof Model);
      });

      it('`raw: false` works for get()', async () => {
        const instance = await rawPeople.get(david.id, NOT_RAW);

        expect(instance instanceof Model);
      });

      it('`raw: false` works for create()', async () => {
        const instance = await rawPeople.create({ name: 'Sarah' }, NOT_RAW);

        expect(instance instanceof Model);

        await rawPeople.remove(instance.id);
      });

      it('`raw: false` works for bulk create()', async () => {
        const results = await rawPeople.create([{ name: 'Sarah' }], NOT_RAW);

        expect(results.length).to.equal(1);
        expect(results[0] instanceof Model);

        await rawPeople.remove(results[0].id);
      });

      it('`raw: false` works for patch()', async () => {
        const instance = await rawPeople.patch(david.id, { name: 'Sarah' }, NOT_RAW);

        expect(instance instanceof Model);
      });

      it('`raw: false` works for update()', async () => {
        const instance = await rawPeople.update(david.id, david, NOT_RAW);

        expect(instance instanceof Model);
      });

      it('`raw: false` works for remove()', async () => {
        const instance = await rawPeople.remove(david.id, NOT_RAW);

        expect(instance instanceof Model);
      });
    });
  });

  describe('ORM functionality with overidden getModel method', () => {
    const app = feathers();

    const EXPECTED_ATTRIBUTE_VALUE = 42;

    const extraParams = {
      expectedAttribute: EXPECTED_ATTRIBUTE_VALUE
    };

    class ExtendedService extends service.Service {
      getModel (params) {
        if (params.expectedAttribute !== EXPECTED_ATTRIBUTE_VALUE) {
          throw new Error('Custom attribute not found in overridden getModel()!');
        }
        return this.Model;
      }
    }

    function extendedService (options) {
      return new ExtendedService(options);
    }

    app.use('/raw-people', extendedService({
      Model,
      events: [ 'testing' ]
    }));
    const rawPeople = app.service('raw-people');

    describe('Non-raw Service Config', () => {
      app.use('/people', extendedService({
        Model,
        events: [ 'testing' ],
        raw: false // -> this is what we are testing
      }));
      const people = app.service('people');
      const _ids = {};
      const _data = {};

      const RETURNING_FALSE = Object.assign({$returning: false}, extraParams);

      beforeEach(() =>
        people.create({name: 'David'}, extraParams).then(result => {
          _data.David = result;
          _ids.David = result.id;
        })
      );

      afterEach(() =>
        people.remove(_ids.David, extraParams).catch(() => {})
      );

      it('find() returns model instances', () =>
        people.find(extraParams).then(results =>
          expect(results[0] instanceof Model).to.be.ok
        )
      );

      it('get() returns a model instance', () =>
        people.get(_ids.David, extraParams).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('create() returns a model instance', () =>
        people.create({name: 'Sarah'}, extraParams).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('bulk create() returns model instances', () =>
        people.create([{name: 'Sarah'}], extraParams).then(results =>
          expect(results[0] instanceof Model).to.be.ok
        )
      );

      it('patch() returns a model instance', () =>
        people.patch(_ids.David, {name: 'Sarah'}, extraParams).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('patch() with $returning=false returns empty array', () =>
        people.patch(_ids.David, {name: 'Sarah'}, RETURNING_FALSE).then(response =>
          expect(response).to.deep.equal([])
        )
      );

      it('update() returns a model instance', () =>
        people.update(_ids.David, _data.David, extraParams).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('remove() returns a model instance', () =>
        people.remove(_ids.David, extraParams).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('remove() with $returning=false returns empty array', () =>
        people.remove(_ids.David, RETURNING_FALSE).then(response =>
          expect(response).to.deep.equal([])
        )
      );
    });

    describe('Non-raw Service Method Calls', () => {
      const _ids = {};
      const _data = {};
      const NOT_RAW = Object.assign({sequelize: {raw: false}}, extraParams);

      beforeEach(() =>
        rawPeople.create({name: 'Dave'}, extraParams).then(result => {
          _data.David = result;
          _ids.David = result.id;
        })
      );

      afterEach(() =>
        rawPeople.remove(_ids.David, extraParams).catch(() => {})
      );

      it('`raw: false` works for find()', () =>
        rawPeople.find(NOT_RAW).then(results =>
          expect(results[0] instanceof Model).to.be.ok
        )
      );

      it('`raw: false` works for get()', () =>
        rawPeople.get(_ids.David, NOT_RAW).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('`raw: false` works for create()', () =>
        rawPeople.create({name: 'Sarah'}, NOT_RAW).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('`raw: false` works for bulk create()', () =>
        rawPeople.create([{name: 'Sarah'}], NOT_RAW).then(results =>
          expect(results[0] instanceof Model).to.be.ok
        )
      );

      it('`raw: false` works for patch()', () =>
        rawPeople.patch(_ids.David, {name: 'Sarah'}, NOT_RAW).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('`raw: false` works for update()', () =>
        rawPeople.update(_ids.David, _data.David, NOT_RAW).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('`raw: false` works for remove()', () =>
        rawPeople.remove(_ids.David, NOT_RAW).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );
    });
  });
});
