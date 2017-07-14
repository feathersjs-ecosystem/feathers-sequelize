'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var factory = function factory(Model) {
  var include = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  return function (item) {
    if (!(item instanceof Model.Instance)) {
      return Model.build(item, { isNewRecord: false, include: include });
    }
    return item;
  };
};

exports.default = function (options) {
  options = options || {};

  return function (hook) {
    if (hook.type !== 'after') {
      throw new Error('feathers-sequelize hydrate() - should only be used as an "after" hook');
    }

    var makeInstance = factory(this.Model, options.include);
    switch (hook.method) {
      case 'find':
        if (hook.result.data) {
          hook.result.data = hook.result.data.map(makeInstance);
        } else {
          hook.result = hook.result.map(makeInstance);
        }
        break;

      case 'get':
      case 'update':
        hook.result = makeInstance(hook.result);
        break;

      case 'create':
      case 'patch':
        if (Array.isArray(hook.result)) {
          hook.result = hook.result.map(makeInstance);
        } else {
          hook.result = makeInstance(hook.result);
        }
        break;
    }
    return Promise.resolve(hook);
  };
};

module.exports = exports['default'];