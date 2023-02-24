import type { FeathersError } from '@feathersjs/errors';
import { BadRequest, Forbidden, GeneralError, NotFound, Timeout, Unavailable } from '@feathersjs/errors';
import type { BaseError } from 'sequelize';
export const ERROR = Symbol('feathers-sequelize/error');
const wrap = (error: FeathersError, original: BaseError) => Object.assign(error, { [ERROR]: original });

export const errorHandler = (error: any) => {
  const { name, message } = error;

  if (name.startsWith('Sequelize')) {
    switch (name) {
    case 'SequelizeValidationError':
    case 'SequelizeUniqueConstraintError':
    case 'SequelizeExclusionConstraintError':
    case 'SequelizeForeignKeyConstraintError':
    case 'SequelizeInvalidConnectionError':
      // @ts-ignore
      throw wrap(new BadRequest(message, { errors: error.errors }), error);
    case 'SequelizeTimeoutError':
    case 'SequelizeConnectionTimedOutError':
      throw wrap(new Timeout(message), error);
    case 'SequelizeConnectionRefusedError':
    case 'SequelizeAccessDeniedError':
      throw wrap(new Forbidden(message), error);
    case 'SequelizeHostNotReachableError':
      throw wrap(new Unavailable(message), error);
    case 'SequelizeHostNotFoundError':
      throw wrap(new NotFound(message), error);
    default:
      throw wrap(new GeneralError(message), error);
    }
  }

  throw error;
};

export const getOrder = (sort: Record<string, any> = {}) => Object.keys(sort).reduce((order, name) => {
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

export const isPlainObject = (obj: any) => {
  return obj && obj.constructor === {}.constructor;
};
