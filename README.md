# feathers-sequelize

[![Build Status](https://travis-ci.org/feathersjs/feathers-sequelize.png?branch=master)](https://travis-ci.org/feathersjs/feathers-sequelize)

> A service adapter for [Sequelize](http://sequelizejs.com), an SQL ORM

## Installation

```bash
npm install feathers-sequelize --save
```

## Documentation

Please refer to the [Feathers database adapter documentation](http://docs.feathersjs.com/databases/readme.html) for more details or directly at:

- [Sequelize](http://docs.feathersjs.com/databases/sequelize.html) - The detailed documentation for this adapter
- [Extending](http://docs.feathersjs.com/databases/extending.html) - How to extend a database adapter
- [Pagination and Sorting](http://docs.feathersjs.com/databases/pagination.html) - How to use pagination and sorting for the database adapter
- [Querying](http://docs.feathersjs.com/databases/querying.html) - The common adapter querying mechanism

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

// Create an in-memory Feathers service with a default page size of 2 items
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
