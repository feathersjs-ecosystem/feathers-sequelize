import type { ServiceOptions } from '@feathersjs/adapter-commons';
import type { Query } from '@feathersjs/feathers';
import type { Includeable, Model, ModelStatic } from 'sequelize';

export interface SequelizeServiceOptions<
  M extends Model = Model
> extends ServiceOptions {
  Model: ModelStatic<M>;
  operators: any;
  raw: boolean;
}

export type SequelizeServiceProvidedOptions<
  M extends Model = Model
> = Partial<SequelizeServiceOptions<M>> & Pick<SequelizeServiceOptions<M>, 'Model'>

export type FilteredQuery = {
  filters: Record<string, any>
  query: Query
  paginate: any
}

export type HydrateOptions = {
  include?: Includeable | Includeable[]
}
