'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var serialize = function serialize(item) {
  if (typeof item.toJSON === 'function') {
    return item.toJSON();
  }
  return item;
};

exports.default = function () {
  return function (hook) {
    switch (hook.method) {
      case 'find':
        if (hook.result.data) {
          hook.result.data = hook.result.data.map(serialize);
        } else {
          hook.result = hook.result.map(serialize);
        }
        break;

      case 'get':
      case 'update':
        hook.result = serialize(hook.result);
        break;

      case 'create':
      case 'patch':
        if (Array.isArray(hook.result)) {
          hook.result = hook.result.map(serialize);
        } else {
          hook.result = serialize(hook.result);
        }
        break;
    }
    return Promise.resolve(hook);
  };
};

module.exports = exports['default'];