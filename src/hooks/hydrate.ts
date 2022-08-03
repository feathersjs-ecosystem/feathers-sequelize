import type { HookContext } from '@feathersjs/feathers';
import type { ModelStatic, Model, Includeable } from 'sequelize';
import type { HydrateOptions } from '../types';

const factory = (Model: ModelStatic<Model>, include?: Includeable | Includeable[]) => {
  return (item: any) => {
    // (Darren): We have to check that the Model.Instance static property exists
    // first since it's been deprecated in Sequelize 4.x.
    // See: http://docs.sequelizejs.com/manual/tutorial/upgrade-to-v4.html
    const shouldBuild = !(item instanceof Model);

    if (shouldBuild) {
      return Model.build(item, { isNewRecord: false, include });
    }

    return item;
  };
};

export default (options?: HydrateOptions) => {
  options = options || {};

  return (context: HookContext) => {
    if (context.type !== 'after') {
      throw new Error('feathers-sequelize hydrate() - should only be used as an "after" hook');
    }

    const makeInstance = factory(context.service.Model, options.include);
    switch (context.method) {
    case 'find':
      if (context.result.data) {
        context.result.data = context.result.data.map(makeInstance);
      } else {
        context.result = context.result.map(makeInstance);
      }
      break;

    case 'get':
    case 'update':
      context.result = makeInstance(context.result);
      break;

    case 'create':
    case 'patch':
      if (Array.isArray(context.result)) {
        context.result = context.result.map(makeInstance);
      } else {
        context.result = makeInstance(context.result);
      }
      break;
    }
    return Promise.resolve(context);
  };
};
