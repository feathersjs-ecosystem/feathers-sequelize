// TypeScript Version: 3.7
import { Params, Paginated, Id, NullableId, Query, Hook } from '@feathersjs/feathers';
import { AdapterService, ServiceOptions, InternalServiceMethods } from '@feathersjs/adapter-commons';

export interface SequelizeServiceOptions extends ServiceOptions {
  Model: any;
  raw: boolean;
}

export class Service<T = any> extends AdapterService<T> implements InternalServiceMethods<T> {
  Model: any;
  options: SequelizeServiceOptions;

  constructor(config?: Partial<SequelizeServiceOptions>);

  getModel(params: Params): any;

  _find(params?: Params): Promise<T | T[] | Paginated<T>>;
  _get(id: Id, params?: Params): Promise<T>;
  _create(data: Partial<T> | Array<Partial<T>>, params?: Params): Promise<T | T[]>;
  _update(id: NullableId, data: T, params?: Params): Promise<T>;
  _patch(id: NullableId, data: Partial<T>, params?: Params): Promise<T>;
  _remove(id: NullableId, params?: Params): Promise<T>;
}

export namespace hooks {
  function dehydrate(options?: any): Hook;
  function hydrate(options?: any): Hook;
}

export const ERROR: symbol;

declare const sequelize: ((config?: Partial<SequelizeServiceOptions>) => Service);
export default sequelize;
