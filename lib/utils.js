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
  let direction;
  if (Array.isArray(sort[name])) {
    direction = parseInt(sort[name][0], 10) === 1 ? 'ASC' : 'DESC';
    direction += parseInt(sort[name][1], 10) === 1 ? ' NULLS FIRST' : ' NULLS LAST';
  } else {
    direction = parseInt(sort[name], 10) === 1 ? 'ASC' : 'DESC';
  }
  order.push([name, direction]);

  return order;
}, []);

exports.isPlainObject = obj => {
  return obj && obj.constructor === {}.constructor;
};
