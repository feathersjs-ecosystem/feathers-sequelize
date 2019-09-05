const errors = require('@feathersjs/errors');
const ERROR = Symbol('feathers-sequelize/error');
const wrap = (error, original) => Object.assign(error, { [ERROR]: original });

exports.ERROR = ERROR;

exports.errorHandler = error => {
  const { name, message } = error;

  if (name.startsWith('Sequelize')) {
    switch (name) {
      case 'SequelizeValidationError':
      case 'SequelizeUniqueConstraintError':
      case 'SequelizeExclusionConstraintError':
      case 'SequelizeForeignKeyConstraintError':
      case 'SequelizeInvalidConnectionError':
        throw wrap(new errors.BadRequest(message, { errors: error.errors }), error);
      case 'SequelizeTimeoutError':
      case 'SequelizeConnectionTimedOutError':
        throw wrap(new errors.Timeout(message), error);
      case 'SequelizeConnectionRefusedError':
      case 'SequelizeAccessDeniedError':
        throw wrap(new errors.Forbidden(message), error);
      case 'SequelizeHostNotReachableError':
        throw wrap(new errors.Unavailable(message), error);
      case 'SequelizeHostNotFoundError':
        throw wrap(new errors.NotFound(message), error);
      default:
        throw wrap(new errors.GeneralError(message), error);
    }
  }

  throw error;
};

exports.getOrder = (sort = {}) => Object.keys(sort).reduce((order, name) => {
  order.push([name, parseInt(sort[name], 10) === 1 ? 'ASC' : 'DESC']);

  return order;
}, []);

exports.isPlainObject = obj => {
  return obj && obj.constructor === {}.constructor;
};
