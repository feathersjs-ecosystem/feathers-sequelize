# feathers-sequelize

[![Greenkeeper badge](https://badges.greenkeeper.io/feathersjs-ecosystem/feathers-sequelize.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/feathersjs-ecosystem/feathers-sequelize.png?branch=master)](https://travis-ci.org/feathersjs-ecosystem/feathers-sequelize)
[![Code Climate](https://codeclimate.com/github/feathersjs-ecosystem/feathers-sequelize.png)](https://codeclimate.com/github/feathersjs-ecosystem/feathers-sequelize)
[![Test Coverage](https://codeclimate.com/github/feathersjs-ecosystem/feathers-sequelize/badges/coverage.svg)](https://codeclimate.com/github/feathersjs-ecosystem/feathers-sequelize/coverage)
[![Dependency Status](https://img.shields.io/david/feathersjs-ecosystem/feathers-sequelize.svg?style=flat-square)](https://david-dm.org/feathersjs-ecosystem/feathers-sequelize)
[![Download Status](https://img.shields.io/npm/dm/feathers-sequelize.svg?style=flat-square)](https://www.npmjs.com/package/feathers-sequelize)
[![Slack Status](http://slack.feathersjs.com/badge.svg)](http://slack.feathersjs.com)

> A service adapter for [Sequelize](http://sequelizejs.com), an SQL ORM

## Installation

```bash
npm install feathers-sequelize --save
```

## Documentation

Please refer to the [Feathers database adapter documentation](https://docs.feathersjs.com/api/databases/common.html) for more details or directly at:

- [Sequelize](https://docs.feathersjs.com/api/databases/sequelize.html) - The detailed documentation for this adapter
- [Extending](https://docs.feathersjs.com/api/databases/common.html#extending-adapters) - How to extend a database adapter
- [Pagination](https://docs.feathersjs.com/api/databases/common.html#pagination) - How to use pagination
- [Querying and Sorting](https://docs.feathersjs.com/api/databases/querying.html) - The common adapter querying mechanism and sorting for the database adapter

### Complete Example

Here is an example of a Feathers server with a `todos` SQLite Sequelize Model:

```js
import path from 'path';
import feathers from 'feathers';
import rest from 'feathers-rest';
import bodyParser from 'body-parser';
import Sequelize from 'sequelize';
import service from 'feathers-sequelize';

const sequelize = new Sequelize('sequelize', '', '', {
  dialect: 'sqlite',
  storage: path.join(__dirname, 'db.sqlite'),
  logging: false
});
const Todo = sequelize.define('todo', {
  text: {
    type: Sequelize.STRING,
    allowNull: false
  },
  complete: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  }
}, {
  freezeTableName: true
});

// Create a feathers instance.
const app = feathers()
  // Enable REST services
  .configure(rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({ extended: true }));

// Removes all database content
Todo.sync({ force: true });

// Create an sqlite backed Feathers service with a default page size of 2 items
// and a maximum size of 4
app.use('/todos', service({
  Model: Todo,
  paginate: {
    default: 2,
    max: 4
  }
}));

// Start the server
app.listen(3030);

console.log('Feathers Todo Sequelize service running on 127.0.0.1:3030');
```

You can run this example by using `node examples/app` and going to [localhost:3030/todos](http://localhost:3030/todos). You should see an empty array. That's because you don't have any Todos yet but you now have full CRUD for your new todos service.

## License

Copyright (c) 2015

Licensed under the [MIT license](LICENSE).
