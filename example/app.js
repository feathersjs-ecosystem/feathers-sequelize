import path from 'path';
import feathers from 'feathers';
import rest from 'feathers-rest';
import bodyParser from 'body-parser';
import Sequelize from 'sequelize';
import service from '../lib';

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

// Removes all database content
Todo.sync({ force: true });

// Create a feathers instance.
var app = feathers()
  // Enable REST services
  .configure(rest())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({ extended: true }));

// Create an in-memory Feathers service with a default page size of 2 items
// and a maximum size of 4
app.use('/todos', service({
  Model: Todo,
  paginate: {
    default: 2,
    max: 4
  }
}));

// A basic error handler, just like Express
app.use(function(error, req, res, next){
  res.json(error);
});

// Start the server
export default app.listen(3030);

console.log('Feathers Todo sequelize service running on 127.0.0.1:3030');
