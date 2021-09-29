const factory = (Model, include = null) => {
  return item => {
    // (Darren): We have to check that the Model.Instance static property exists
    // first since it's been deprecated in Sequelize 4.x.
    // See: http://docs.sequelizejs.com/manual/tutorial/upgrade-to-v4.html
    const shouldBuild = item instanceof Model;

    if (shouldBuild) {
      return Model.build(item, { isNewRecord: false, include });
    }

    return item;
  };
};

module.exports = options => {
  options = options || {};

  return function (hook) {
    if (hook.type !== 'after') {
      throw new Error('feathers-sequelize hydrate() - should only be used as an "after" hook');
    }

    const makeInstance = factory(this.Model, options.include);
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
