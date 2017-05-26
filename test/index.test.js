'use strict';

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _chai = require('chai');

var _feathersServiceTests = require('feathers-service-tests');

var _sequelize = require('sequelize');

var _sequelize2 = _interopRequireDefault(_sequelize);

var Sequelize2 = _sequelize2.default;

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

var _feathers = require('feathers');

var _feathers2 = _interopRequireDefault(_feathers);

var _src = require('../src');

var _src2 = _interopRequireDefault(_src);

var _app = require('../example/app');

var _app2 = _interopRequireDefault(_app);

function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var sequelize = new Sequelize2('sequelize', '', '', {
  dialect: 'sqlite',
  storage: './db.sqlite',
  logging: false
});
var Model = sequelize.define('people', {
  name: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  age: {
    type: _sequelize2.default.INTEGER
  },
  created: {
    type: _sequelize2.default.BOOLEAN
  },
  time: {
    type: _sequelize2.default.INTEGER
  }
}, {
  freezeTableName: true
});
var CustomId = sequelize.define('people-customid', {
  customid: {
    type: _sequelize2.default.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  age: {
    type: _sequelize2.default.INTEGER
  },
  created: {
    type: _sequelize2.default.BOOLEAN
  },
  time: {
    type: _sequelize2.default.INTEGER
  }
}, {
  freezeTableName: true
});
var TaskModel = sequelize.define('tasks', {
  description: {
    type: _sequelize2.default.STRING,
    allowNull: false
  },
  completed: {
    type: _sequelize2.default.BOOLEAN,
    allowNull: false
  }
});
var ProjectModel = sequelize.define('projects', {
  name: {
    type: _sequelize2.default.STRING,
    allowNull: false
  }
});
TaskModel.belongsTo(Model, {
  as: 'owner'
});
TaskModel.belongsTo(ProjectModel, {
  as: 'project'
});
Model.hasMany(TaskModel, {
  as: 'tasks',
  foreignKey: 'ownerId'
});

describe('Feathers Sequelize Service', function () {
  before(function () {
    return Model.sync({ force: true }).then(function () {
      return CustomId.sync({ force: true });
    }).then(function () {
      return TaskModel.sync({ force: true });
    }).then(function () {
      return ProjectModel.sync({ force: true });
    });
  });

  describe('Initialization', function () {
    it('throws an error when missing options', function () {
      (0, _chai.expect)(_src2.default.bind(null)).to.throw('Sequelize options have to be provided');
    });

    it('throws an error when missing a Model', function () {
      (0, _chai.expect)(_src2.default.bind(null, { name: 'Test' })).to.throw(/You must provide a Sequelize Model/);
    });
  });

  describe('Common functionality', function () {
    var app = (0, _feathers2.default)().use('/people', (0, _src2.default)({
      Model: Model,
      events: ['testing']
    })).use('/people-customid', (0, _src2.default)({
      Model: CustomId,
      events: ['testing'],
      id: 'customid'
    })).use('/tasks', (0, _src2.default)({
      Model: TaskModel
    }));

    it('allows querying for null values (#45)', function () {
      var name = 'Null test';
      var people = app.service('people');

      return people.create({ name: name }).then(function (person) {
        return people.find({ query: { age: null } }).then(function (people) {
          _assert2.default.equal(people.length, 1);
          _assert2.default.equal(people[0].name, name);
          _assert2.default.equal(people[0].age, null);
        }).then(function () {
          return people.remove(person.id);
        });
      });
    });

    (0, _feathersServiceTests.base)(app, _feathersErrors2.default);
    (0, _feathersServiceTests.base)(app, _feathersErrors2.default, 'people-customid', 'customid');
  });

  describe('ORM functionality', function () {
    var app = (0, _feathers2.default)();
    app.use('/raw-people', (0, _src2.default)({
      Model: Model,
      events: ['testing']
    }));
    var rawPeople = app.service('raw-people');

    // common ORM tests
    (0, _feathersServiceTests.orm)(rawPeople, _feathersErrors2.default);

    describe('Non-raw Service Config', function () {
      app.use('/people', (0, _src2.default)({
        Model: Model,
        events: ['testing'],
        raw: false // -> this is what we are testing
      }));
      var people = app.service('people');
      var _ids = {};
      var _data = {};

      beforeEach(function () {
        return people.create({ name: 'David' }).then(function (result) {
          _data.David = result;
          _ids.David = result.id;
        });
      });

      afterEach(function () {
        return people.remove(_ids.David).catch(function () {});
      });

      it('find() returns model instances', function () {
        return people.find().then(function (results) {
          return (0, _chai.expect)(results[0] instanceof Model.Instance).to.be.ok;
        });
      });

      it('get() returns a model instance', function () {
        return people.get(_ids.David).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });

      it('create() returns a model instance', function () {
        return people.create({ name: 'Sarah' }).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });

      it('bulk create() returns model instances', function () {
        return people.create([{ name: 'Sarah' }]).then(function (results) {
          return (0, _chai.expect)(results[0] instanceof Model.Instance).to.be.ok;
        });
      });

      it('patch() returns a model instance', function () {
        return people.patch(_ids.David, { name: 'Sarah' }).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });

      it('update() returns a model instance', function () {
        return people.update(_ids.David, _data.David).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });

      it('remove() returns a model instance', function () {
        return people.remove(_ids.David).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });
    });

    describe('Non-raw Service Method Calls', function () {
      var _ids = {};
      var _data = {};
      var NOT_RAW = { sequelize: { raw: false } };

      beforeEach(function () {
        return rawPeople.create({ name: 'David' }).then(function (result) {
          _data.David = result;
          _ids.David = result.id;
        });
      });

      afterEach(function () {
        return rawPeople.remove(_ids.David).catch(function () {});
      });

      it('`raw: false` works for find()', function () {
        return rawPeople.find(NOT_RAW).then(function (results) {
          return (0, _chai.expect)(results[0] instanceof Model.Instance).to.be.ok;
        });
      });

      it('`raw: false` works for get()', function () {
        return rawPeople.get(_ids.David, NOT_RAW).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });

      it('`raw: false` works for create()', function () {
        return rawPeople.create({ name: 'Sarah' }, NOT_RAW).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });

      it('`raw: false` works for bulk create()', function () {
        return rawPeople.create([{ name: 'Sarah' }], NOT_RAW).then(function (results) {
          return (0, _chai.expect)(results[0] instanceof Model.Instance).to.be.ok;
        });
      });

      it('`raw: false` works for patch()', function () {
        return rawPeople.patch(_ids.David, { name: 'Sarah' }, NOT_RAW).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });

      it('`raw: false` works for update()', function () {
        return rawPeople.update(_ids.David, _data.David, NOT_RAW).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });

      it('`raw: false` works for remove()', function () {
        return rawPeople.remove(_ids.David, NOT_RAW).then(function (instance) {
          return (0, _chai.expect)(instance instanceof Model.Instance).to.be.ok;
        });
      });
    });

    describe('Dot-notation expansion (implicit eager-loading)', function () {
      var store = {};
      app.use('/people', (0, _src2.default)({
        Model: Model,
        raw: false
      }));
      app.use('/tasks', (0, _src2.default)({
        Model: TaskModel,
        raw: false
      }));
      var people = app.service('people');
      var tasks = app.service('tasks');
      before(function () {
        return people.create({ name: 'Ronald' }).then(function (taskOwner) {
          store.taskOwner = taskOwner;
          return store.taskOwner;
        }).then(function () {
          return ProjectModel.create({ name: 'Project A' });
        }).then(function (projectA) {
          store.projectA = projectA;
          return store.projectA;
        }).then(function () {
          return TaskModel.create({ description: 'Do it', completed: false });
        }).then(function (task) {
          store.task1 = task;
          return store.task1;
        }).then(function () {
          return store.task1.setOwner(store.taskOwner);
        }).then(function () {
          return store.task1.setProject(store.projectA);
        }).then(function () {
          return TaskModel.create({ description: 'Do it again', completed: false });
        }).then(function (task) {
          return task.setOwner(store.taskOwner);
        });
      });

      it('(belongsTo association eager loading and query) should "expand" owner.name query to `include` the `owner` eager loaded model', function () {
        return tasks.find({ query: { 'owner.name': 'Ronald' } }).then(function (res) {
          return Promise.all([
          // console.log(res),
            (0, _chai.expect)(res).instanceof(Object).and.lengthOf(2), (0, _chai.expect)(res[0].owner).to.exist]);
        });
      });

      it('(hasMany association eager loading and query) should return one owner with only the one task we queried for', function () {
        return people.find({ query: { 'tasks.description': 'Do it again' } }).then(function (res) {
          return Promise.all([
          // console.log(res[0].tasks.length),
          // res.map((item) => console.log(item.name)),
            (0, _chai.expect)(res).to.exist.and.instanceOf(Array).and.lengthOf(1), (0, _chai.expect)(res[0].tasks).to.exist.and.instanceOf(Array).and.lengthOf(1), (0, _chai.expect)(res[0].tasks[0].description).to.equal('Do it again')]);
        });
      });

      it('(People `tasks.project.name` nested eager loading query) should return one owner with one task matching to the project name "Project A"', function () {
        return people.find({ query: { 'tasks.project.name': 'Project A' } }).then(function (res) {
          return Promise.all([
          // console.log(res[0].tasks.length),
          // res.map((item) => console.log(item.name)),
            (0, _chai.expect)(res).to.exist.and.instanceOf(Array).and.lengthOf(1), (0, _chai.expect)(res[0].tasks).to.exist.and.instanceOf(Array).and.lengthOf(1), (0, _chai.expect)(res[0].tasks[0].description).to.equal('Do it')]);
        });
      });
    });
  });
});

describe('Sequelize service example test', function () {
  after(function (done) {
    return _app2.default.close(function () {
      return done();
    });
  });

  (0, _feathersServiceTests.example)();
});
