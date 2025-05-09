import type { FeathersError } from '@feathersjs/errors'
import {
  BadRequest,
  Forbidden,
  GeneralError,
  NotFound,
  Timeout,
  Unavailable,
} from '@feathersjs/errors'
import type { BaseError } from 'sequelize'
export const ERROR = Symbol('feathers-sequelize/error')

const wrap = (error: FeathersError, original: BaseError) =>
  Object.assign(error, { [ERROR]: original })

export const errorHandler = (error: any) => {
  const { name, message } = error

  if (name.startsWith('Sequelize')) {
    switch (name) {
      case 'SequelizeValidationError':
      case 'SequelizeUniqueConstraintError':
      case 'SequelizeExclusionConstraintError':
      case 'SequelizeForeignKeyConstraintError':
      case 'SequelizeInvalidConnectionError':
        throw wrap(new BadRequest(message, { errors: error.errors }), error)
      case 'SequelizeTimeoutError':
      case 'SequelizeConnectionTimedOutError':
        throw wrap(new Timeout(message), error)
      case 'SequelizeConnectionRefusedError':
      case 'SequelizeAccessDeniedError':
        throw wrap(new Forbidden(message), error)
      case 'SequelizeHostNotReachableError':
        throw wrap(new Unavailable(message), error)
      case 'SequelizeHostNotFoundError':
        throw wrap(new NotFound(message), error)
      default:
        throw wrap(new GeneralError(message), error)
    }
  }

  throw error
}

export const getOrder = (sort: Record<string, any> = {}): [string, string][] =>
  Object.keys(sort).reduce(
    (order, name) => {
      let direction: 'ASC' | 'DESC' | 'ASC NULLS FIRST' | 'DESC NULLS LAST'
      if (Array.isArray(sort[name])) {
        direction = parseInt(sort[name][0], 10) === 1 ? 'ASC' : 'DESC'
        direction +=
          parseInt(sort[name][1], 10) === 1 ? ' NULLS FIRST' : ' NULLS LAST'
      } else {
        direction = parseInt(sort[name], 10) === 1 ? 'ASC' : 'DESC'
      }
      order.push([name, direction])

      return order
    },
    [] as [string, string][],
  )

export const isPlainObject = (obj: any): boolean => {
  return !!obj && obj.constructor === {}.constructor
}

export const isPresent = (obj: any): boolean => {
  if (Array.isArray(obj)) {
    return obj.length > 0
  }
  if (isPlainObject(obj)) {
    return Object.keys(obj).length > 0
  }
  return !!obj
}
