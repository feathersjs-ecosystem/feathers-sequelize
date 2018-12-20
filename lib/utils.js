const errors = require('@feathersjs/errors');

exports.errorHandler = error => {
  let feathersError = error;

  if (error.name) {
    switch (error.name) {
      case 'SequelizeValidationError':
      case 'SequelizeUniqueConstraintError':
      case 'SequelizeExclusionConstraintError':
      case 'SequelizeForeignKeyConstraintError':
      case 'SequelizeInvalidConnectionError':
        throw new errors.BadRequest(error);
      case 'SequelizeTimeoutError':
      case 'SequelizeConnectionTimedOutError':
        throw new errors.Timeout(error);
      case 'SequelizeConnectionRefusedError':
      case 'SequelizeAccessDeniedError':
        throw new errors.Forbidden(error);
      case 'SequelizeHostNotReachableError':
        throw new errors.Unavailable(error);
      case 'SequelizeHostNotFoundError':
        throw new errors.NotFound(error);
    }
  }

  throw feathersError;
};

exports.getOrder = (sort = {}) => Object.keys(sort).reduce((order, name) => {
  order.push([ name, parseInt(sort[name], 10) === 1 ? 'ASC' : 'DESC' ]);

  return order;
}, []);
