const pg = require('pg');
const assert = require('assert');
const { expect } = require('chai');

const { base, orm } = require('feathers-service-tests');

const Sequelize = require('sequelize');
const errors = require('@feathersjs/errors');
const feathers = require('@feathersjs/feathers');

const service = require('../lib');

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
  before(() =>
    Model.sync({ force: true })
      .then(() => CustomId.sync({ force: true }))
      .then(() => CustomGetterSetter.sync({ force: true }))
      .then(() => Order.sync({ force: true }))
  );

  describe('Initialization', () => {
    it('throws an error when missing options', () => {
      expect(service.bind(null)).to.throw('Sequelize options have to be provided');
    });

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

    base(app, errors);
    base(app, errors, 'people-customid', 'customid');
  });

  describe('Feathers-Sequelize Specific Tests', () => {
    const app = feathers()
      .use('/people', service({
        Model,
        paginate: {
          default: 10
        },
        events: [ 'testing' ]
      }))
      .use('/orders', service({
        Model: Order
      }))
      .use('/custom-getter-setter', service({
        Model: CustomGetterSetter,
        events: [ 'testing' ]
      }));

    before(() => app.service('people')
      .remove(null, { query: { $limit: 1000 } })
    );

    after(() => app.service('people')
      .remove(null, { query: { $limit: 1000 } })
    );

    describe('Common functionality', () => {
      const people = app.service('people');
      const _ids = {};
      const _data = {};

      beforeEach(() =>
        people.create({ name: 'Kirsten', age: 30 }).then(result => {
          _data.Kirsten = result;
          _ids.Kirsten = result.id;
        })
      );

      afterEach(() =>
        people.remove(_ids.Kirsten).catch(() => {})
      );

      it('allows querying for null values (#45)', () => {
        const name = 'Null test';

        return people.create({ name }).then(person =>
          people.find({ query: { age: null } }).then(people => {
            assert.equal(people.data.length, 1);
            assert.equal(people.data[0].name, name);
            assert.equal(people.data[0].age, null);
          })
            .then(() => people.remove(person.id))
            .catch((err) => { people.remove(person.id); throw (err); })
        );
      });

      it('correctly persists updates (#125)', () => {
        const updateName = 'Ryan';

        return people.update(_ids.Kirsten, { name: updateName })
          .then((data) => people.get(_ids.Kirsten))
          .then(updatedPerson => {
            assert.equal(updatedPerson.name, updateName);
          });
      });

      it('corrently updates records using optional query param', () => {
        const updateAge = 40;
        const updateName = 'Kirtsten';
        return people.update(_ids.Kirsten, { name: updateName, age: updateAge }, {query: {name: 'Kirsten'}})
          .then((data) => people.get(_ids.Kirsten))
          .then(updatedPerson => {
            assert.equal(updatedPerson.age, updateAge);
          });
      });

      it('fails update when query prevents result in no record match for id', () => {
        const updateAge = 50;
        const updateName = 'Kirtsten';
        return people.update(_ids.Kirsten, { name: updateName, age: updateAge }, {query: {name: 'John'}})
          .then((data) => assert(false, 'Should have thrown an error'))
          .catch(err => assert(err.message.indexOf('No record found') >= 0));
      });
    });

    describe('Association Tests', () => {
      const people = app.service('people');
      const orders = app.service('orders');
      const _ids = {};
      const _data = {};

      beforeEach(() =>
        people.create({ name: 'Kirsten', age: 30 })
          .then(result => {
            _data.Kirsten = result;
            _ids.Kirsten = result.id;
            return orders.create([
              { name: 'Order 1', personId: result.id },
              { name: 'Order 2', personId: result.id },
              { name: 'Order 3', personId: result.id }
            ]);
          })
          .then(() => people.create({ name: 'Ryan', age: 30 }))
          .then(result => {
            _data.Ryan = result;
            _ids.Ryan = result.id;
            return orders.create([
              { name: 'Order 4', personId: result.id },
              { name: 'Order 5', personId: result.id },
              { name: 'Order 6', personId: result.id }
            ]);
          })
      );

      afterEach(() =>
        orders.remove(null, { query: { $limit: 1000 } })
          .then(() => people.remove(_ids.Kirsten))
          .then(() => people.remove(_ids.Ryan))
          .catch(() => {})
      );

      it('find() returns correct total when using includes for non-raw requests (#137)', () => {
        const options = {sequelize: {raw: false, include: Order}};
        return people.find(options).then(result => {
          assert.equal(result.total, 2);
        });
      });

      it('find() returns correct total when using includes for raw requests', () => {
        const options = {sequelize: {include: Order}};
        return people.find(options).then(result => {
          assert.equal(result.total, 2);
        });
      });
    });

    describe('Custom getters and setters', () => {
      it('calls custom getters and setters (#113)', () => {
        const value = 0;
        const service = app.service('custom-getter-setter');
        const data = {addsOneOnGet: value, addsOneOnSet: value};

        return service.create(data).then(result => {
          assert.equal(result.addsOneOnGet, value + 1);
          assert.equal(result.addsOneOnSet, value + 1);
        });
      });

      it('can ignore custom getters and setters (#113)', () => {
        const value = 0;
        const service = app.service('custom-getter-setter');
        const data = {addsOneOnGet: value, addsOneOnSet: value};
        const IGNORE_SETTERS = {sequelize: {ignoreSetters: true}};
        return service.create(data, IGNORE_SETTERS).then(result => {
          assert.equal(result.addsOneOnGet, value + 1);
          assert.equal(result.addsOneOnSet, value);
        });
      });
    });

    it('can set the scope of an operation#130', () => {
      const people = app.service('people');
      const data = {name: 'Active', status: 'active'};
      const SCOPE_TO_ACTIVE = {sequelize: {scope: 'active'}};
      const SCOPE_TO_PENDING = {sequelize: {scope: 'pending'}};
      return people.create(data).then(person => {
        return people.find(SCOPE_TO_ACTIVE).then(result => {
          assert.equal(result.data.length, 1);
          return people.find(SCOPE_TO_PENDING).then(result => {
            assert.equal(result.data.length, 0);
          });
        })
          .then(() => people.remove(person.id))
          .catch((err) => { people.remove(person.id); throw (err); });
      });
    });
  });

  describe('ORM functionality', () => {
    const app = feathers();
    app.use('/raw-people', service({
      Model,
      events: [ 'testing' ]
    }));
    const rawPeople = app.service('raw-people');

    // common ORM tests
    orm(rawPeople, errors);

    describe('Non-raw Service Config', () => {
      app.use('/people', service({
        Model,
        events: [ 'testing' ],
        raw: false // -> this is what we are testing
      }));
      const people = app.service('people');
      const _ids = {};
      const _data = {};

      beforeEach(() =>
        people.create({name: 'David'}).then(result => {
          _data.David = result;
          _ids.David = result.id;
        })
      );

      afterEach(() =>
        people.remove(_ids.David).catch(() => {})
      );

      it('find() returns model instances', () =>
        people.find().then(results =>
          expect(results[0] instanceof Model).to.be.ok
        )
      );

      it('get() returns a model instance', () =>
        people.get(_ids.David).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('create() returns a model instance', () =>
        people.create({name: 'Sarah'}).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('bulk create() returns model instances', () =>
        people.create([{name: 'Sarah'}]).then(results =>
          expect(results[0] instanceof Model).to.be.ok
        )
      );

      it('patch() returns a model instance', () =>
        people.patch(_ids.David, {name: 'Sarah'}).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('patch() with $returning=false returns empty array', () =>
        people.patch(_ids.David, {name: 'Sarah'}, {$returning: false}).then(response =>
          expect(response).to.deep.equal([])
        )
      );

      it('update() returns a model instance', () =>
        people.update(_ids.David, _data.David).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('remove() returns a model instance', () =>
        people.remove(_ids.David).then(instance =>
          expect(instance instanceof Model).to.be.ok
        )
      );

      it('remove() with $returning=false returns empty array', () =>
        people.remove(_ids.David, {$returning: false}).then(response =>
          expect(response).to.deep.equal([])
        )
      );
    });

    describe('Non-raw Service Method Calls', () => {
      const _ids = {};
      const _data = {};
      const NOT_RAW = {sequelize: {raw: false}};

      beforeEach(() =>
        rawPeople.create({name: 'David'}).then(result => {
          _data.David = result;
          _ids.David = result.id;
        })
      );

      afterEach(() =>
        rawPeople.remove(_ids.David).catch(() => {})
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
