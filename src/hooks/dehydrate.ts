import type { HookContext } from '@feathersjs/feathers';

const serialize = (item: any) => {
  if (typeof item.toJSON === 'function') {
    return item.toJSON();
  }
  return item;
};

export default () => {
  return function (context: HookContext) {
    switch (context.method) {
    case 'find':
      if (context.result.data) {
        context.result.data = context.result.data.map(serialize);
      } else {
        context.result = context.result.map(serialize);
      }
      break;

    case 'get':
    case 'update':
      context.result = serialize(context.result);
      break;

    case 'create':
    case 'patch':
      if (Array.isArray(context.result)) {
        context.result = context.result.map(serialize);
      } else {
        context.result = serialize(context.result);
      }
      break;
    }
    return Promise.resolve(context);
  };
};
