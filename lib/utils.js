'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.errorHandler = errorHandler;
exports.getOrder = getOrder;
exports.getWhere = getWhere;

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function errorHandler(error) {
  var feathersError = error;

  if (error.name) {
    switch (error.name) {
      case 'SequelizeValidationError':
      case 'SequelizeUniqueConstraintError':
      case 'SequelizeExclusionConstraintError':
      case 'SequelizeForeignKeyConstraintError':
      case 'SequelizeInvalidConnectionError':
        feathersError = new _feathersErrors2.default.BadRequest(error);
        break;
      case 'SequelizeTimeoutError':
      case 'SequelizeConnectionTimedOutError':
        feathersError = new _feathersErrors2.default.Timeout(error);
        break;
      case 'SequelizeConnectionRefusedError':
      case 'SequelizeAccessDeniedError':
        feathersError = new _feathersErrors2.default.Forbidden(error);
        break;
      case 'SequelizeHostNotReachableError':
        feathersError = new _feathersErrors2.default.Unavailable(error);
        break;
      case 'SequelizeHostNotFoundError':
        feathersError = new _feathersErrors2.default.NotFound(error);
        break;
    }
  }

  throw feathersError;
}

function getOrder() {
  var sort = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var order = [];

  Object.keys(sort).forEach(function (name) {
    return order.push([name, parseInt(sort[name], 10) === 1 ? 'ASC' : 'DESC']);
  });

  return order;
}

function getWhere(query) {
  var where = _extends({}, query);

  Object.keys(where).forEach(function (prop) {
    var value = where[prop];
    if (value && value.$nin) {
      value = _extends({}, value);

      value.$notIn = value.$nin;
      delete value.$nin;

      where[prop] = value;
    }
  });

  return where;
}