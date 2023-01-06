import { SequelizeAdapter } from './adapter';
import type { SequelizeAdapterParams } from './declarations';
import type { Id, NullableId, Paginated, Params, ServiceMethods } from '@feathersjs/feathers';
import type { PaginationOptions } from '@feathersjs/adapter-commons';

export * from './declarations'
export * from './adapter'
export * from './hooks';
export { ERROR, errorHandler } from './utils';
export class SequelizeService<Result = any, Data = Partial<Result>, ServiceParams extends Params<any> = SequelizeAdapterParams, PatchData = Partial<Data>>
  extends SequelizeAdapter<Result, Data, ServiceParams, PatchData>
  implements ServiceMethods<Result | Paginated<Result>, Data, ServiceParams, PatchData>
{
  async find (params?: ServiceParams & { paginate?: PaginationOptions }): Promise<Paginated<Result>>
  async find (params?: ServiceParams & { paginate: false }): Promise<Result[]>
  async find (params?: ServiceParams): Promise<Paginated<Result> | Result[]> {
    return this._find(params) as any
  }

  async get (id: Id, params?: ServiceParams): Promise<Result> {
    return this._get(id, params)
  }

  async create (data: Data, params?: ServiceParams): Promise<Result>
  async create (data: Data[], params?: ServiceParams): Promise<Result[]>
  async create (data: Data | Data[], params?: ServiceParams): Promise<Result | Result[]>
  async create (data: Data | Data[], params?: ServiceParams): Promise<Result | Result[]> {
    return this._create(data, params)
  }

  async update (id: Id, data: Data, params?: ServiceParams): Promise<Result> {
    return this._update(id, data, params)
  }

  async patch (id: Id, data: PatchData, params?: ServiceParams): Promise<Result>
  async patch (id: null, data: PatchData, params?: ServiceParams): Promise<Result[]>
  async patch (id: NullableId, data: PatchData, params?: ServiceParams): Promise<Result | Result[]> {
    return this._patch(id, data, params)
  }

  async remove (id: Id, params?: ServiceParams): Promise<Result>
  async remove (id: null, params?: ServiceParams): Promise<Result[]>
  async remove (id: NullableId, params?: ServiceParams): Promise<Result | Result[]> {
    return this._remove(id, params)
  }
}
