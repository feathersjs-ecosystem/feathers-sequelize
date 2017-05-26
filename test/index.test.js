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
const TaskModel = sequelize.define('tasks', {
    description: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
    },
});
TaskModel.belongsTo(Model, {
    as: 'owner',
});

describe('Feathers Sequelize Service', () => {
  before(() =>
    Model.sync({ force: true })
      .then(() => CustomId.sync({ force: true }))
      .then(() => TaskModel.sync({ force: true }))
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
      .use('/tasks', service({
          Model: TaskModel
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
          expect(results[0] instanceof Model.Instance).to.be.ok
        )
      );

      it('get() returns a model instance', () =>
        people.get(_ids.David).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('create() returns a model instance', () =>
        people.create({name: 'Sarah'}).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('bulk create() returns model instances', () =>
        people.create([{name: 'Sarah'}]).then(results =>
          expect(results[0] instanceof Model.Instance).to.be.ok
        )
      );

      it('patch() returns a model instance', () =>
        people.patch(_ids.David, {name: 'Sarah'}).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('update() returns a model instance', () =>
        people.update(_ids.David, _data.David).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('remove() returns a model instance', () =>
        people.remove(_ids.David).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
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
          expect(results[0] instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for get()', () =>
        rawPeople.get(_ids.David, NOT_RAW).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for create()', () =>
        rawPeople.create({name: 'Sarah'}, NOT_RAW).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for bulk create()', () =>
        rawPeople.create([{name: 'Sarah'}], NOT_RAW).then(results =>
          expect(results[0] instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for patch()', () =>
        rawPeople.patch(_ids.David, {name: 'Sarah'}, NOT_RAW).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for update()', () =>
        rawPeople.update(_ids.David, _data.David, NOT_RAW).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );

      it('`raw: false` works for remove()', () =>
        rawPeople.remove(_ids.David, NOT_RAW).then(instance =>
          expect(instance instanceof Model.Instance).to.be.ok
        )
      );
    });
    
    describe('Dot-notation expansion (implicit eager-loading)', () => {
      const store = {};
      const people = app.service('people');
      app.use('/tasks', service({
          Model: TaskModel,
          raw: false,
      }));
      const tasks = app.service('tasks');
      beforeEach(() => 
        people.create({name: 'Ronald'})
          .then((taskOwner) => store.taskOwner = taskOwner)
          .then(() => TaskModel.create({ description: 'Do it', completed: false}))
          .then((task) => task.setOwner(store.taskOwner))
      );

      it('should "expand" owner.name query to `include` the `owner` eager loaded model', () =>
        tasks.find({ query: { 'owner.name': 'Ronald' } })
          .then((res) => Promise.all([
            //console.log(res),
            expect(res).instanceof(Object).and.lengthOf(1),
            expect(res[0].owner).to.exist,
          ]))
      );
    });
  });
});

describe('Sequelize service example test', () => {
  after(done => server.close(() => done()));

  example();
});
