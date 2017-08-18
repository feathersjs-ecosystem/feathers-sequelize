import pg from 'pg';
import assert from 'assert';
import { expect } from 'chai';
import { base, example, orm } from 'feathers-service-tests';

import Sequelize from 'sequelize';
import errors from 'feathers-errors';
import feathers from 'feathers';
import service from '../src';
import server from '../example/app';

// The base tests require the use of Sequelize.BIGINT to avoid 'out of range errors'
// Unfortunetly BIGINT's are serialized as Strings:
// https://github.com/sequelize/sequelize/issues/1774
pg.defaults.parseInt8 = true;

const sequelize = new Sequelize('sequelize', '', '', {
  dialect: 'sqlite',
  storage: './db.sqlite',
  logging: false
});
const postgres = new Sequelize('sequelize', 'postgres', '', {
  host: 'localhost',
  dialect: 'postgres'
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

const PostgresModel = postgres.define('people', {
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

describe('Feathers Sequelize Service', () => {
  before(() =>
    Model.sync({ force: true })
      .then(() => CustomId.sync({ force: true }))
      .then(() => CustomGetterSetter.sync({ force: true }))
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
      }))
      .use('/custom-getter-setter', service({
        Model: CustomGetterSetter,
        events: [ 'testing' ]
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

    it('can set the scope of an operation#130', () => {
      const service = app.service('people');
      const data = {name: 'Active', status: 'active'};
      const SCOPE_TO_ACTIVE = {sequelize: {scope: 'active'}};
      const SCOPE_TO_PENDING = {sequelize: {scope: 'pending'}};
      return service.create(data).then(person => {
        return service.find(SCOPE_TO_ACTIVE).then(people => {
          assert.equal(people.length, 1);
          return service.find(SCOPE_TO_PENDING).then(people => {
            assert.equal(people.length, 0);
          });
        }).then(() => service.remove(person.id));
      });
    });

    base(app, errors);
    base(app, errors, 'people-customid', 'customid');
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

  describe('PostgreSQL', () => {
    const app = feathers()
      .use('/people', service({
        Model: PostgresModel,
        events: [ 'testing' ]
      }));

    before(() => PostgresModel.sync({ force: true }));
    base(app, errors);
  });
});

describe('Sequelize service example test', () => {
  after(done => server.close(() => done()));

  example();
});
