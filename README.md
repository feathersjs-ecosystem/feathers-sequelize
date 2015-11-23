# feathers-sequelize

[![Build Status](https://travis-ci.org/feathersjs/feathers-sequelize.png?branch=master)](https://travis-ci.org/feathersjs/feathers-sequelize)

> A service adapter for [Sequelize](http://sequelizejs.com) an SQL ORM

## Installation

```bash
npm install feathers-sequelize --save
```


## Getting Started

`feathers-sequelize` hooks a Sequelize Model up as a service.

```js
var feathersSequelize = require('feathers-sequelize');

app.use('/todos', feathersSequelize(Model));
```

### Complete Example

Here is an example of a Feathers server with a `todos` SQLite Sequelize Model:

```js
var feathers = require('feathers');
var bodyParser = require('body-parser');
var sequelizeService = require('feathers-sequelize');
var Sequelize = require('sequelize');
var sequelize = new Sequelize('sequelize', '', '', {
  dialect: 'sqlite',
  storage: './db.sqlite',
  logging: false
});
var Todo = sequelize.define('todo', {
  text: {
    type: Sequelize.STRING
  },
  completed: {
    type: Sequelize.BOOLEAN
  }
}, {
  freezeTableName: true
});

// Create a feathers instance.
var app = feathers()
  // Setup the public folder.
  .use(feathers.static(__dirname + '/public'))
  // Enable Socket.io
  .configure(feathers.socketio())
  // Enable REST services
  .configure(feathers.rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({ extended: true }))

// Create a /todos endpoint with a service that hooks up to the Todo model
app.use('/todos', sequelizeService(Todo));

// Start the server.
var port = 8080;
app.listen(port, function() {
  console.log('Feathers server listening on port ' + port);
});
```

You can run this example by using `node examples/basic` and going to [localhost:8080/todos](http://localhost:8080/todos). You should see an empty array. That's because you don't have any Todos yet but you now have full CRUD for your new todos service.

### Extending

You can also extend any of the feathers services to do something custom.

```js
var feathers = require('feathers');
var UserModel = require('./models/user');
var sequelizeService = require('feathers-sequelize');
var app = feathers();

var myUserService = sequelizeService(UserModel).extend({
  find: function(params, cb){
    // Do something awesome!

    console.log('I am extending the find method');

    this._super.apply(this, arguments);
  }
});

app.configure(feathers.rest())
   .use('/users', myUserService)
   .listen(8080);
```

### With hooks

Another option is to weave functionality into your existing services using [feathers-hooks](https://github.com/feathersjs/feathers-hooks), for example the above `createdAt` and `updatedAt` functionality:

```js
var feathers = require('feathers');
var hooks = require('feathers-hooks');
var sequelizeService = require('feathers-sequelize');
var UserModel = require('./models/user');

// Initialize a MongoDB service with the users collection on a local MongoDB instance
var app = feathers()
  .configure(hooks())
  .use('/users', sequelizeService(UserModel));

app.lookup('users').before({
  create: function(hook, next) {
    hook.data.createdAt = new Date();
    next();
  },

  update: function(hook, next) {
    hook.data.updatedAt = new Date();
    next();
  }
});

app.listen(8080);
```

## Options

All that needs to be passed to create a service is the Sequelize model instance.

## Query Parameters

The `find` API allows the use of `$limit`, `$skip`, `$sort`, and `$select` in the query.  These special parameters can be passed directly inside the query object:

```js
// Find all recipes that include salt, limit to 10, only include name field.
{"ingredients":"salt", "$limit":10, "$select": { "name" :1 } } // JSON

GET /?ingredients=salt&$limit=10&$select[name]=1 // HTTP
```

As a result of allowing these to be put directly into the query string, you won't want to use `$limit`, `$skip`, `$sort`, or `$select` as the name of fields in your document schema.

### `$limit`

`$limit` will return only the number of results you specify:

```
// Retrieves the first two records found where age is 37.
query: {
  age: 37,
  $limit: 2
}
```

### `$skip`

`$skip` will skip the specified number of results:

```
// Retrieves all except the first two records found where age is 37.
query: {
  age: 37,
  $skip: 2
}
```

### `$sort`

`$sort` will sort based on the object you provide:

```
// Retrieves all where age is 37, sorted ascending alphabetically by name.
query: {
  age: 37,
  $sort: { name: 1 }
}

// Retrieves all where age is 37, sorted descending alphabetically by name.
query: {
  age: 37,
  $sort: { name: -1}
}
```

### `$select`

`$select` support in a query allows you to pick which fields to include or exclude in the results.

```
// Only retrieve name.
query: {
  name: 'Alice',
  $select: {'name': 1}
}

// Retrieve everything except age.
query: {
  name: 'Alice',
  $select: {'age': 0}
}
```


## Filter criteria

In addition to sorting and pagination, properties can also be filtered by criteria. Standard criteria can just be added to the query. For example, the following find all users with the name `Alice`:

```js
query: {
  name: 'Alice'
}
```

Additionally, the following advanced criteria are supported for each property.

### $in, $nin

Find all records where the property does (`$in`) or does not (`$nin`) contain the given values. For example, the following query finds every user with the name of `Alice` or `Bob`:

```js
query: {
  name: {
    $in: ['Alice', 'Bob']
  }
}
```

### $lt, $lte

Find all records where the value is less (`$lt`) or less and equal (`$lte`) to a given value. The following query retrieves all users 25 or younger:

```js
query: {
  age: {
    $lte: 25
  }
}
```

### $gt, $gte

Find all records where the value is more (`$gt`) or more and equal (`$gte`) to a given value. The following query retrieves all users older than 25:

```js
query: {
  age: {
    $gt: 25
  }
}
```

### $ne

Find all records that do not contain the given property value, for example anybody not age 25:

```js
query: {
  age: {
    $ne: 25
  }
}
```

### $or

Find all records that match any of the given objects. For example, find all users name Bob or Alice:

```js
query: {
  $or: [
    { name: 'Alice' },
    { name: 'Bob' }
  ]
}
```

## Changelog

__0.1.0__

- Initial release

## License

Copyright (c) 2015

Licensed under the [MIT license](LICENSE).
