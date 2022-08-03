import type { Model } from 'sequelize/types';
import { Service } from './adapter';
import * as hooks from './hooks';
import {
  dehydrate,
  hydrate
} from './hooks';
import type { SequelizeServiceProvidedOptions } from './types';

const init = <
  T extends Record<string, any> = Record<string, any>,
  M extends Model = Model
>(options: SequelizeServiceProvidedOptions<M>) => new Service<T, M>(options);

export { ERROR } from './utils';
export {
  hooks,
  Service,
  dehydrate,
  hydrate
}

export * from './types';

export default init;

// cjs fix
if (typeof module !== 'undefined') {
  module.exports = Object.assign(init, module.exports);
}
