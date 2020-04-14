# feathers-sequelize

[![Greenkeeper badge](https://badges.greenkeeper.io/feathersjs-ecosystem/feathers-sequelize.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/feathersjs-ecosystem/feathers-sequelize.png?branch=master)](https://travis-ci.org/feathersjs-ecosystem/feathers-sequelize)
[![Dependency Status](https://img.shields.io/david/feathersjs-ecosystem/feathers-sequelize.svg?style=flat-square)](https://david-dm.org/feathersjs-ecosystem/feathers-sequelize)
[![Download Status](https://img.shields.io/npm/dm/feathers-sequelize.svg?style=flat-square)](https://www.npmjs.com/package/feathers-sequelize)

A [Feathers](https://feathersjs.com) database adapter for [Sequelize](http://sequelizejs.com), an ORM for Node.js. It supports PostgreSQL, MySQL, MariaDB, SQLite and MSSQL and features transaction support, relations, read replication and more.

<!-- TOC -->

- [feathers-sequelize](#feathers-sequelize)
  - [API](#api)
    - [`service(options)`](#serviceoptions)
    - [params.sequelize](#paramssequelize)
    - [operators](#operators)
  - [Caveats](#caveats)
    - [Sequelize `raw` queries](#sequelize-raw-queries)
    - [Working with MSSQL](#working-with-mssql)
  - [Example](#example)
  - [Associations](#associations)
    - [Embrace the ORM](#embrace-the-orm)
    - [Setting `params.sequelize.include`](#setting-paramssequelizeinclude)
  - [Querying](#querying)
  - [Working with Sequelize Model instances](#working-with-sequelize-model-instances)
  - [Validation](#validation)
  - [Testing sequelize queries in isolation](#testing-sequelize-queries-in-isolation)
    - [1. Build a test file](#1-build-a-test-file)
    - [2. Integrate the query using a "before" hook](#2-integrate-the-query-using-a-before-hook)
  - [Migrations](#migrations)
    - [Initial Setup: one-time tasks](#initial-setup-one-time-tasks)
    - [Migrations workflow](#migrations-workflow)
    - [Create a new migration](#create-a-new-migration)
      - [Add the up/down scripts:](#add-the-updown-scripts)
      - [Keeping your app code in sync with migrations](#keeping-your-app-code-in-sync-with-migrations)
    - [Apply a migration](#apply-a-migration)
    - [Undo the previous migration](#undo-the-previous-migration)
    - [Reverting your app to a previous state](#reverting-your-app-to-a-previous-state)
    - [Migrating](#migrating)
  - [License](#license)

<!-- /TOC -->

> __Very Important:__ Before using this adapter you have to be familiar with both, the [Feathers Basics](https://docs.feathersjs.com/guides/basics/setup.html) and general use of [Sequelize](http://docs.sequelizejs.com/). For associations and relations see the [associations](#associations) section. This adapter may not cover all use cases but they can still be implemented using Sequelize models directly in a [Custom Feathers service](https://docs.feathersjs.com/guides/basics/services.html).

```bash
npm install --save feathers-sequelize
```

And [one of the following](http://docs.sequelizejs.com/en/latest/docs/getting-started/):

```bash
npm install --save pg pg-hstore
npm install --save mysql2 // For both mysql and mariadb dialects
npm install --save sqlite3
npm install --save tedious // MSSQL
```

> __Important:__ `feathers-sequelize` implements the [Feathers Common database adapter API](https://docs.feathersjs.com/api/databases/common.html) and [querying syntax](https://docs.feathersjs.com/api/databases/querying.html).
> For more information about models and general Sequelize usage, follow up in the [Sequelize documentation](http://docs.sequelizejs.com/en/latest/).

## API

### `service(options)`

Returns a new service instance initialized with the given options.

```js
const Model = require('./models/mymodel');
const service = require('feathers-sequelize');

app.use('/messages', service({ Model }));
app.use('/messages', service({ Model, id, events, paginate }));
```

__Options:__

- `Model` (**required**) - The Sequelize model definition
- `id` (*optional*, default: primary key of the model) - The name of the id field property. Will use the first property with `primaryKey: true` by default.
- `raw` (*optional*, default: `true`) - Runs queries faster by returning plain objects instead of Sequelize models.
- `Sequelize` (*optional*, default: `Model.sequelize.Sequelize`) - The Sequelize instance
- `events` (*optional*) - A list of [custom service events](https://docs.feathersjs.com/api/events.html#custom-events) sent by this service
- `paginate` (*optional*) - A [pagination object](https://docs.feathersjs.com/api/databases/common.html#pagination) containing a `default` and `max` page size
- `multi` (*optional*) - Allow `create` with arrays and `update` and `remove` with `id` `null` to change multiple items. Can be `true` for all methods or an array of allowed methods (e.g. `[ 'remove', 'create' ]`)
- `operators` (*optional*) - A mapping from query syntax property names to to [Sequelize secure operators](http://docs.sequelizejs.com/manual/tutorial/querying.html)
- `whitelist` (*optional*) - A list of additional query parameters to allow (e..g `[ '$regex', '$geoNear' ]`). Default is the supported `operators`

### params.sequelize

When making a [service method](https://docs.feathersjs.com/api/services.html) call, `params` can contain an `sequelize` property which allows to pass additional Sequelize options. This can e.g. be used to **retrieve associations**. Normally this wil be set in a before [hook](https://docs.feathersjs.com/api/hooks.html):

```js
app.service('messages').hooks({
  before: {
    find(context) {
      // Get the Sequelize instance. In the generated application via:
      const sequelize = context.app.get('sequelizeClient');
      const { User } = sequelize.models;

      context.params.sequelize = {
        include: [ User ]
      }

      return context;
    }
  }
});
```

### operators

Sequelize deprecated string based operators a while ago for security reasons. Starting at version 4.0.0 `feathers-sequelize` converts queries securely. If you want to support additional Sequelize operators, the `operators` service option can contain a mapping from query parameter name to Sequelize operator. By default supported are:

```
'$eq',
'$ne',
'$gte',
'$gt',
'$lte',
'$lt',
'$in',
'$nin',
'$like',
'$notLike',
'$iLike',
'$notILike',
'$or',
'$and'
```

```
// Find all messages in room 2 or 5
app.service('users').find({
  query: {
    name: {
      $like: 'Dav%'
    }
  }
});
```

```
GET /users?name[$like]=Dav%
```

## Caveats

### Sequelize `raw` queries

By default, all `feathers-sequelize` operations will return `raw` data (using `raw: true` when querying the database). This results in faster execution and allows feathers-sequelize to interoperate with feathers-common hooks and other 3rd party integrations. However, this will bypass some of the "goodness" you get when using Sequelize as an ORM:

 - custom getters/setters will be bypassed
 - model-level validations are bypassed
 - associated data loads a bit differently
 - ...and several other issues that one might not expect

Don't worry! The solution is easy. Please read the guides about [working with model instances](#working-with-sequelize-model-instances).

### Working with MSSQL

When using MSSQL as the database, a default sort order always has to be applied, otherwise the adapter will throw an `Invalid usage of the option NEXT in the FETCH statement.` error. This can be done in your model with:

```js
model.beforeFind(model => model.order.push(['id', 'ASC']))
```

Or in a hook like this:

```js
module.exports = function (options = {}) {
  return async context => {
    const { query = {} } = context.params;
    // Sort by id field ascending (or any other property you want)
    // See https://docs.feathersjs.com/api/databases/querying.html#sort
    const $sort = { id: 1 };

    context.params.query = {
      $sort: {

      },
      ...query
    }

    return context;
  }
}
```

## Example

Here is an example of a Feathers server with a `messages` SQLite Sequelize Model:

```
$ npm install @feathersjs/feathers @feathersjs/errors @feathersjs/express @feathersjs/socketio sequelize feathers-sequelize sqlite3
```

In `app.js`:

```js
const path = require('path');
const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');

const Sequelize = require('sequelize');
const service = require('feathers-sequelize');

const sequelize = new Sequelize('sequelize', '', '', {
  dialect: 'sqlite',
  storage: path.join(__dirname, 'db.sqlite'),
  logging: false
});
const Message = sequelize.define('message', {
  text: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  freezeTableName: true
});

// Create an Express compatible Feathers application instance.
const app = express(feathers());

// Turn on JSON parser for REST services
app.use(express.json());
// Turn on URL-encoded parser for REST services
app.use(express.urlencoded({ extended: true }));
// Enable REST services
app.configure(express.rest());
// Enable Socket.io services
app.configure(socketio());
// Create an in-memory Feathers service with a default page size of 2 items
// and a maximum size of 4
app.use('/messages', service({
  Model: Message,
  paginate: {
    default: 2,
    max: 4
  }
}));
app.use(express.errorHandler());

Message.sync({ force: true }).then(() => {
  // Create a dummy Message
  app.service('messages').create({
    text: 'Message created on server'
  }).then(message => console.log('Created message', message));
});

// Start the server
const port = 3030;

app.listen(port, () => {
  console.log(`Feathers server listening on port ${port}`);
});
```

Run the example with `node app` and go to [localhost:3030/messages](http://localhost:3030/messages).


## Associations

### Embrace the ORM

The documentation on [Sequelize associations and relations](http://docs.sequelizejs.com/manual/tutorial/associations.html) is essential to implementing associations with this adapter and one of the steepest parts of the Sequelize learning curve. If you have never used an ORM, let it do a lot of the heavy lifting for you!

### Setting `params.sequelize.include`

Once you understand how the `include` option works with Sequelize, you will want to set that option from a [before hook](https://docs.feathersjs.com/guides/basics/hooks.html) in Feathers. Feathers will pass the value of `context.params.sequelize` as the options parameter for all Sequelize method calls. This is what your hook might look like:

```js
// GET /my-service?name=John&include=1
function (context) {
  const { include, ...query };

   if (include) {
      const AssociatedModel = context.app.services.fooservice.Model;
      context.params.sequelize = {
         include: [{ model: AssociatedModel }]
      };
      // Update the query to not include `include`
      context.params.query = query;
   }

   return context;
}
```

Underneath the hood, feathers will call your models find method sort of like this:

```js
// YourModel is a sequelize model
const options = Object.assign({ where: { name: 'John' }}, context.params.sequelize);
YourModel.findAndCount(options);
```

For more information, follow up up in the [Sequelize documentation for associations](http://docs.sequelizejs.com/manual/tutorial/associations.html) and [this issue](https://github.com/feathersjs-ecosystem/feathers-sequelize/issues/20).

## Querying

Additionally to the [common querying mechanism](https://docs.feathersjs.com/api/databases/querying.html) this adapter also supports all [Sequelize query operators](http://docs.sequelizejs.com/manual/tutorial/querying.html).

> **Note**: This adapter supports an additional `$returning` parameter for patch and remove queries. By setting `params.$returning = false` it will disable feathers and sequelize from returning what was changed, so mass updates can be done without overwhelming node and/or clients.

## Working with Sequelize Model instances

It is highly recommended to use `raw` queries, which is the default. However, there are times when you will want to take advantage of [Sequelize Instance](http://docs.sequelizejs.com/en/latest/api/instance/) methods. There are two ways to tell feathers to return Sequelize instances:

1. Set `{ raw: false }` in a "before" hook:
    ```js
    function rawFalse(context) {
        if (!context.params.sequelize) context.params.sequelize = {};
        Object.assign(context.params.sequelize, { raw: false });
        return context;
    }
    hooks.before.find = [rawFalse];
    ```
1. Use the new `hydrate` hook in the "after" phase:

    ```js
    const hydrate = require('feathers-sequelize/hooks/hydrate');
    hooks.after.find = [hydrate()];

    // Or, if you need to include associated models, you can do the following:
     function includeAssociated (context) {
         return hydrate({
            include: [{ model: context.app.services.fooservice.Model }]
         }).call(this, context);
     }
     hooks.after.find = [includeAssociated];
     ```

  For a more complete example see this [gist](https://gist.github.com/sicruse/bfaa17008990bab2fd1d76a670c3923f).

> **Important:** When working with Sequelize Instances, most of the feathers-hooks-common will no longer work. If you need to use a common hook or other 3rd party hooks, you should use the "dehydrate" hook to convert data back to a plain object:
> ```js
> const hydrate = require('feathers-sequelize/hooks/hydrate');
> const dehydrate = require('feathers-sequelize/hooks/dehydrate');
> const { populate } = require('feathers-hooks-common');
>
> hooks.after.find = [hydrate(), doSomethingCustom(), dehydrate(), populate()];
> ```

## Validation

Sequelize by default gives you the ability to [add validations at the model level](http://docs.sequelizejs.com/en/latest/docs/models-definition/#validations). Using an error handler like the one that [comes with Feathers](https://github.com/feathersjs/feathers-errors/blob/master/src/error-handler.js) your validation errors will be formatted nicely right out of the box!

## Testing sequelize queries in isolation

If you wish to use some of the more advanced features of sequelize, you should first test your queries in isolation (without feathers). Once your query is working, you can integrate it into your feathers app.

### 1. Build a test file

Creat a temporary file in your project root like this:

```js
// test.js
const app = require('./src/app');
// run setup to initialize relations
app.setup();
const seqClient = app.get('sequelizeClient');
const SomeModel = seqClient.models['some-model'];
const log = console.log.bind(console);

SomeModel.findAll({
   /*
    * Build your custom query here. We will use this object later.
    */
}).then(log).catch(log);
```

And then run this file like this:

```
node test.js
```
Continue updating the file and running it until you are satisfied with the results.

### 2. Integrate the query using a "before" hook

Once your have your custom query working to your satisfaction, you will want to integrate it into your feathers app. Take the guts of the `findAll` operation above and create a "before" hook:

```js
function buildCustomQuery(context) {
	context.params.sequelize = {
       /*
        * This is the same object you passed to "findAll" above.
        * This object is *shallow merged* onto the underlying query object
        * generated by feathers-sequelize (it is *not* a deep merge!).
        * The underlying data will already contain the following:
        *   - "where" condition based on query paramters
        *   - "limit" and "offset" based on pagination settings
        *   - "order" based $sort query parameter
        * You can override any/all of the underlying data by setting it here.
        * This gives you full control over the query object passed to sequelize!
        */
	};
}

someService.hooks({
	before: {
		find: [buildCustomQuery]
	}
});
```


## Migrations

Migrations with feathers and sequelize are quite simple. This guide will walk you through creating the recommended file structure, but you are free to rearrange things as you see fit. The following assumes you have a `migrations` folder in the root of your app.

### Initial Setup: one-time tasks

- Install the [sequelize CLI](https://github.com/sequelize/cli):

```
npm install sequelize-cli --save -g
```

- Create a `.sequelizerc` file in your project root with the following content:

```js
const path = require('path');

module.exports = {
  'config': path.resolve('migrations/config.js'),
  'migrations-path': path.resolve('migrations/scripts'),
  'seeders-path': path.resolve('migrations/seeders'),
  'models-path': path.resolve('migrations/models.js')
};
```

- Create the migrations config in `migrations/config.js`:

```js
const app = require('../src/app');
const env = process.env.NODE_ENV || 'development';
const dialect = 'postgres'; // Or your dialect name

module.exports = {
  [env]: {
    dialect,
    url: app.get(dialect),
    migrationStorageTableName: '_migrations'
  }
};
```

- Define your models config in `migrations/models.js`:

```js
const Sequelize = require('sequelize');
const app = require('../src/app');
const sequelize = app.get('sequelizeClient');
const models = sequelize.models;

// The export object must be a dictionary of model names -> models
// It must also include sequelize (instance) and Sequelize (constructor) properties
module.exports = Object.assign({
  Sequelize,
  sequelize
}, models);
```

### Migrations workflow

The migration commands will load your application and it is therefore required that you define the same environment variables as when running your application. For example, many applications will define the database connection string in the startup command:

```
DATABASE_URL=postgres://user:pass@host:port/dbname npm start
```
All of the following commands assume that you have defined the same environment variables used by your application.

> **ProTip:** To save typing, you can export environment variables for your current bash/terminal session:

```
export DATABASE_URL=postgres://user:pass@host:port/db
```

### Create a new migration

To create a new migration file, run the following command and provide a meaningful name:

```
sequelize migration:create --name="meaningful-name"
```

This will create a new file in the `migrations/scripts` folder. All migration file names will be prefixed with a sortable data/time string: `20160421135254-meaningful-name.js`. This prefix is crucial for making sure your migrations are executed in the proper order.

> **NOTE:** The order of your migrations is determined by the alphabetical order of the migration scripts in the file system. The file names generated by the CLI tools will always ensure that the most recent migration comes last.

#### Add the up/down scripts:

Open the newly created migration file and write the code to both apply and undo the migration. Please refer to the [sequelize migration functions](http://docs.sequelizejs.com/en/latest/docs/migrations/#functions) for available operations. **Do not be lazy - write the down script too and test!** Here is an example of converting a `NOT NULL` column accept null values:

```js
'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.changeColumn('tableName', 'columnName', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.changeColumn('tableName', 'columnName', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};
```

> **ProTip:** As of this writing, if you use the `changeColumn` method you must **always** specify the `type`, even if the type is not changing.

> **ProTip:** Down scripts are typically easy to create and should be nearly identical to the up script except with inverted logic and inverse method calls.

#### Keeping your app code in sync with migrations

The application code should always be up to date with the migrations. This allows the app to be freshly installed with everything up-to-date without running the migration scripts. Your migrations should also never break a freshly installed app. This often times requires that you perform any necessary checks before executing a task. For example, if you update a model to include a new field, your migration should first check to make sure that new field does not exist:

```js
'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.describeTable('tableName').then(attributes => {
      if ( !attributes.columnName ) {
        return queryInterface.addColumn('tableName', 'columnName', {
          type: Sequelize.INTEGER,
          defaultValue: 0
        });
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.describeTable('tableName').then(attributes => {
      if ( attributes.columnName ) {
        return queryInterface.removeColumn('tableName', 'columnName');
      }
    });
  }
};
```

### Apply a migration

The CLI tools will always run your migrations in the correct order and will keep track of which migrations have been applied and which have not. This data is stored in the database under the `_migrations` table. To ensure you are up to date, simply run the following:

```
sequelize db:migrate
```

> **ProTip:** You can add the migrations script to your application startup command to ensure that all migrations have run every time your app is started. Try updating your package.json `scripts` attribute and run `npm start`:

```
scripts: {
    start: "sequelize db:migrate && node src/"
}
```

### Undo the previous migration

To undo the last migration, run the following command:

```
sequelize db:migrate:undo
```

Continue running the command to undo each migration one at a time - the migrations will be undone in the proper order.

> **Note:** - You shouldn't really have to undo a migration unless you are the one developing a new migration and you want to test that it works. Applications rarely have to revert to a previous state, but when they do you will be glad you took the time to write and test your `down` scripts!

### Reverting your app to a previous state

In the unfortunate case where you must revert your app to a previous state, it is important to take your time and plan your method of attack. Every application is different and there is no one-size-fits-all strategy for rewinding an application. However, most applications should be able to follow these steps (order is important):

1. Stop your application (kill the process)
1. Find the last stable version of your app
1. Count the number of migrations which have been added since that version
1. Undo your migrations one at a time until the db is in the correct state
1. Revert your code back to the previous state
1. Start your app

### Migrating

`feathers-sequelize` 4.0.0 comes with important security and usability updates.

> __Important:__ For general migration information to the new database adapter functionality see [crow.docs.feathersjs.com/migrating.html#database-adapters](https://crow.docs.feathersjs.com/migrating.html#database-adapters).

The following breaking changes have been introduced:

- All methods now take `params.sequelize` into account
- All methods allow additional query parameters
- Multiple updates are disabled by default (see the `multi` option)
- Upgraded to secure Sequelize operators (see the [operators](#operators) option)
- Errors no longer contain Sequelize specific information. The original Sequelize error can be retrieved on the server via:

```js
const { ERROR } = require('feathers-sequelize');

try {
  await sequelizeService.doSomethign();
} catch(error) {
  // error is a FeathersError
  // Safely retrieve the Sequelize error
  const sequelizeError = error[ERROR];
}
```

## License

Copyright (c) 2019

Licensed under the [MIT license](LICENSE).
