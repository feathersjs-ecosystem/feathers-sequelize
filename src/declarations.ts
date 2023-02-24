import type { AdapterParams, AdapterQuery, AdapterServiceOptions } from '@feathersjs/adapter-commons';
import type { Includeable, ModelStatic } from 'sequelize';

export interface SequelizeAdapterOptions extends AdapterServiceOptions {
  Model: ModelStatic<any>;
  raw?: boolean;
  operatorMap?: Record<string, symbol>
}

export interface SequelizeAdapterParams<Q = AdapterQuery> extends AdapterParams<Q, Partial<SequelizeAdapterOptions>> {
  sequelize?: any // FindOptions | CreateOptions | BulkCreateOptions
  $returning?: boolean
}

export type HydrateOptions = {
  include?: Includeable | Includeable[]
}
