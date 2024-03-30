import { MethodNotAllowed, NotFound } from '@feathersjs/errors';
import { _ } from '@feathersjs/commons';
import {
  select as selector,
  AdapterBase,
  filterQuery
} from '@feathersjs/adapter-commons';
import type { PaginationOptions } from '@feathersjs/adapter-commons';
import type { SequelizeAdapterOptions, SequelizeAdapterParams } from './declarations';
import type { Id, NullableId, Paginated, Query } from '@feathersjs/feathers';
import { errorHandler, getOrder, isPlainObject, isPresent } from './utils';
import { Op } from 'sequelize';
import type {
  CreateOptions,
  UpdateOptions,
  FindOptions,
  Model
} from 'sequelize';

const defaultOperatorMap = {
  $eq: Op.eq,
  $ne: Op.ne,
  $gte: Op.gte,
  $gt: Op.gt,
  $lte: Op.lte,
  $lt: Op.lt,
  $in: Op.in,
  $nin: Op.notIn,
  $like: Op.like,
  $notLike: Op.notLike,
  $iLike: Op.iLike,
  $notILike: Op.notILike,
  $or: Op.or,
  $and: Op.and
};

const defaultFilters = {
  $and: true as const
}

export class SequelizeAdapter<
  Result,
  Data = Partial<Result>,
  ServiceParams extends SequelizeAdapterParams = SequelizeAdapterParams,
  PatchData = Partial<Data>
> extends AdapterBase<Result, Data, PatchData, ServiceParams, SequelizeAdapterOptions> {
  constructor (options: SequelizeAdapterOptions) {
    if (!options.Model) {
      throw new Error('You must provide a Sequelize Model');
    }

    if (options.operators && !Array.isArray(options.operators)) {
      throw new Error('The \'operators\' option must be an array. For migration from feathers.js v4 see: https://github.com/feathersjs-ecosystem/feathers-sequelize/tree/dove#migrate-to-feathers-v5-dove');
    }

    const operatorMap = {
      ...defaultOperatorMap,
      ...options.operatorMap
    };
    const operators = Object.keys(operatorMap);
    if (options.operators) {
      options.operators.forEach(op => {
        if (!operators.includes(op)) {
          operators.push(op)
        }
      });
    }

    const { primaryKeyAttributes } = options.Model;
    const id = typeof primaryKeyAttributes === 'object' && primaryKeyAttributes[0] !== undefined
      ? primaryKeyAttributes[0]
      : 'id';

    const filters = {
      ...defaultFilters,
      ...options.filters
    };

    super({
      id,
      ...options,
      operatorMap,
      filters,
      operators
    });
  }

  get raw () {
    return this.options.raw !== false;
  }

  get Op () {
    // @ts-ignore
    return this.options.Model.sequelize.Sequelize.Op;
  }

  get Model () {
    if (!this.options.Model) {
      throw new Error('The Model getter was called with no Model provided in options!');
    }

    return this.options.Model;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getModel (_params?: ServiceParams) {
    if (!this.options.Model) {
      throw new Error('getModel was called without a Model present in the constructor options and without overriding getModel! Perhaps you intended to override getModel in a child class?');
    }

    return this.options.Model;
  }

  ModelWithScope (params: ServiceParams) {
    const Model = this.getModel(params);
    if (params?.sequelize?.scope) {
      return Model.scope(params.sequelize.scope);
    }
    return Model;
  }

  convertOperators (q: any): Query {
    if (Array.isArray(q)) {
      return q.map(subQuery => this.convertOperators(subQuery));
    }

    if (!isPlainObject(q)) {
      return q;
    }

    const { operatorMap } = this.options;

    const converted: Record<string | symbol, any> = Object.keys(q).reduce((result: Record<string, any>, prop) => {
      const value = q[prop];
      const key = (operatorMap[prop] ? operatorMap[prop] : prop) as string;

      result[key] = this.convertOperators(value);

      return result;
    }, {});

    Object.getOwnPropertySymbols(q).forEach(symbol => {
      converted[symbol] = q[symbol];
    });

    return converted;
  }

  filterQuery (params: ServiceParams) {
    const options = this.getOptions(params)
    const { filters, query: _query } = filterQuery(params.query || {}, options)

    const query = this.convertOperators({
      ..._query,
      ..._.omit(filters, '$select', '$skip', '$limit', '$sort')
    });

    if (filters.$select) {
      if (!filters.$select.includes(this.id)) {
        filters.$select.push(this.id);
      }
      filters.$select = filters.$select.map((select: any) => `${select}`);
    }

    return {
      filters,
      query,
      paginate: options.paginate
    }
  }

  // paramsToAdapter (id: NullableId, _params?: ServiceParams): FindOptions {
  paramsToAdapter (id: NullableId, _params?: ServiceParams): any {
    const params = _params || {} as ServiceParams;
    const { filters, query: where } = this.filterQuery(params);

    // Until Sequelize fix all the findAndCount issues, a few 'hacks' are needed to get the total count correct

    // Adding an empty include changes the way the count is done
    // See: https://github.com/sequelize/sequelize/blob/7e441a6a5ca44749acd3567b59b1d6ceb06ae64b/lib/model.js#L1780-L1782
    // sequelize.include = sequelize.include || [];

    const defaults = {
      where,
      attributes: filters.$select,
      distinct: true,
      returning: true,
      raw: this.raw,
      ...params.sequelize
    }

    if (id === null) {
      return {
        order: getOrder(filters.$sort),
        limit: filters.$limit,
        offset: filters.$skip,
        ...defaults
      } as FindOptions
    }

    const sequelize: FindOptions = {
      limit: 1,
      ...defaults
    };

    if (where[this.id] === id) {
      return sequelize;
    }

    if (this.id in where) {
      const { and } = this.Op;
      where[and] = where[and]
        ? [...where[and], { [this.id]: id }]
        : { [this.id]: id };
    } else {
      where[this.id] = id;
    }

    return sequelize;
  }

  async _find (params?: ServiceParams & { paginate?: PaginationOptions }): Promise<Paginated<Result>>
  async _find (params?: ServiceParams & { paginate: false }): Promise<Result[]>
  async _find (params?: ServiceParams): Promise<Paginated<Result> | Result[]>
  async _find (params: ServiceParams = {} as ServiceParams): Promise<Paginated<Result> | Result[]> {
    const Model = this.ModelWithScope(params);
    const { paginate } = this.filterQuery(params);
    const sequelize = this.paramsToAdapter(null, params);

    if (!paginate || !paginate.default) {
      const result = await Model.findAll(sequelize).catch(errorHandler);
      return result;
    }

    if (sequelize.limit === 0) {
      const total = await Model
        .count({ ...sequelize, attributes: undefined })
        .catch(errorHandler);

      return {
        // @ts-ignore
        total,
        limit: sequelize.limit,
        skip: sequelize.offset || 0,
        data: []
      }
    }

    const result = await Model.findAndCountAll(sequelize).catch(errorHandler);

    return {
      total: result.count,
      limit: sequelize.limit,
      skip: sequelize.offset || 0,
      data: result.rows
    }
  }

  async _get (id: Id, params: ServiceParams = {} as ServiceParams): Promise<Result> {
    const Model = this.ModelWithScope(params);
    const sequelize = this.paramsToAdapter(id, params);
    const result = await Model.findAll(sequelize).catch(errorHandler);
    if (result.length === 0) {
      throw new NotFound(`No record found for id '${id}'`);
    }
    return result[0];
  }

  async _create (data: Data, params?: ServiceParams): Promise<Result>
  async _create (data: Data[], params?: ServiceParams): Promise<Result[]>
  async _create (data: Data | Data[], params?: ServiceParams): Promise<Result | Result[]>
  async _create (data: Data | Data[], params: ServiceParams = {} as ServiceParams): Promise<Result | Result[]> {
    const isArray = Array.isArray(data);
    const select = selector(params, this.id);

    if (isArray && !this.allowsMulti('create', params)) {
      throw new MethodNotAllowed('Can not create multiple entries')
    }

    if (isArray && data.length === 0) {
      return []
    }

    const Model = this.ModelWithScope(params);
    const sequelize = this.paramsToAdapter(null, params);

    if (isArray) {
      const instances = await Model
        .bulkCreate(data as any[], sequelize)
        .catch(errorHandler);

      if (sequelize.returning === false) {
        return [];
      }

      const selected = isPresent(sequelize.attributes);

      if (sequelize.raw) {
        const result = instances.map((instance) => {
          if (selected) {
            return select(instance.toJSON());
          }
          return instance.toJSON();
        })
        return result;
      }

      if (selected) {
        const result = instances.map((instance) => {
          const result = select(instance.toJSON())
          return Model.build(result, { isNewRecord: false });
        })
        return result;
      }

      return instances;
    }

    const result = await Model
      .create(data as any, sequelize as CreateOptions)
      .catch(errorHandler);

    if (sequelize.raw) {
      return select((result as Model).toJSON())
    }

    return result;
  }

  async _patch (id: null, data: PatchData, params?: ServiceParams): Promise<Result[]>
  async _patch (id: Id, data: PatchData, params?: ServiceParams): Promise<Result>
  async _patch (id: NullableId, data: PatchData, params: ServiceParams = {} as ServiceParams): Promise<Result | Result[]> {
    if (id === null && !this.allowsMulti('patch', params)) {
      throw new MethodNotAllowed('Can not patch multiple entries')
    }

    const Model = this.ModelWithScope(params);
    const sequelize = this.paramsToAdapter(id, params);
    const select = selector(params, this.id);
    const values = _.omit(data, this.id);
    let ids: Id[] | null = null;

    if (id === null) {
      const current = await this._find({
        ...params,
        paginate: false,
        query: {
          ...params?.query,
          $select: [this.id]
        }
      });

      if (!current.length) {
        return []
      }

      ids = current.map((item: any) => item[this.id]);

      // @ts-ignore
      let [, instances] = await Model
        .update(values, {
          ...sequelize,
          where: { [this.id]: ids.length === 1 ? ids[0] : { [this.Op.in]: ids } }
        } as UpdateOptions)
        .catch(errorHandler) as [number, Model[]?];

      if (sequelize.returning === false) {
        return []
      }

      // Returning is only supported in postgres and mssql, and
      // its a little goofy array order how Sequelize handles it.
      // https://github.com/sequelize/sequelize/blob/abca55ee52d959f95c98dc7ae8b8162005536d05/packages/core/src/model.js#L3110
      if (!instances || typeof instances === 'number') {
        instances = null;
      }

      const selected = isPresent(sequelize.attributes);

      if (instances) {
        if (isPresent(params.query?.$sort)) {
          const sortedInstances: Model[] = [];
          const unsortedInstances: Model[] = [];

          current.forEach((item: any) => {
            const id = item[this.id];
            // @ts-ignore
            const instance = instances.find(instance => instance[this.id] === id);
            if (instance) {
              sortedInstances.push(instance);
            } else {
              unsortedInstances.push(item);
            }
          });

          instances = [...sortedInstances, ...unsortedInstances];
        }

        if (sequelize.raw) {
          const result = instances.map((instance) => {
            if (selected) {
              return select(instance.toJSON());
            }
            return instance.toJSON();
          })
          return result;
        }

        if (selected) {
          const result = instances.map((instance) => {
            const result = select(instance.toJSON())
            return Model.build(result, { isNewRecord: false });
          })
          return result;
        }

        return instances as Result[];
      }

      const result = await this._find({
        ...params,
        paginate: false,
        query: {
          [this.id]: ids.length === 1 ? ids[0] : { $in: ids },
          $select: params?.query?.$select,
          $sort: params?.query?.$sort
        }
      });

      return result;
    }


    const instance = await this._get(id, {
      ...params,
      sequelize: { ...params.sequelize, raw: false }
    }) as Model;

    instance.set(values)

    await instance
      .save(sequelize)
      .catch(errorHandler);

    if (isPresent(sequelize.include)) {
      return this._get(id, {
        ...params,
        query: { $select: params.query?.$select }
      });
    }

    if (sequelize.raw) {
      const result = instance.toJSON();
      if (isPresent(sequelize.attributes)) {
        return select(result);
      }
      return result;
    }

    if (isPresent(sequelize.attributes)) {
      const result = select(instance.toJSON())
      return Model.build(result, { isNewRecord: false });
    }

    return instance as Result;
  }

  async _update (id: Id, data: Data, params: ServiceParams = {} as ServiceParams): Promise<Result> {
    const Model = this.ModelWithScope(params);
    const sequelize = this.paramsToAdapter(id, params);
    const select = selector(params, this.id);

    const total = await Model
      .count({ ...sequelize, attributes: undefined })
      .catch(errorHandler);

    if (!total) {
      throw new NotFound(`No record found for id '${id}'`);
    }

    const values = Object.values(Model.getAttributes())
      .reduce((values, attribute: any) => {
        const key = attribute.fieldName as string;
        if (key === this.id) {
          // @ts-ignore
          values[key] = id;
          return values
        }
        // @ts-ignore
        values[key] = key in data ? data[key] : null;
        return values;
      }, {});

    const instance = await Model
      .build(values, { isNewRecord: false })
      .update(_.omit(values, this.id), sequelize)
      .catch(errorHandler);

    if (isPresent(sequelize.include)) {
      return this._get(id, {
        ...params,
        query: { $select: params.query?.$select }
      });
    }

    if (sequelize.raw) {
      const result = instance.toJSON();
      if (isPresent(sequelize.attributes)) {
        return select(result);
      }
      return result;
    }

    if (isPresent(sequelize.attributes)) {
      const result = select(instance.toJSON())
      return Model.build(result, { isNewRecord: false });
    }

    return instance as Result;
  }

  async _remove (id: null, params?: ServiceParams): Promise<Result[]>
  async _remove (id: Id, params?: ServiceParams): Promise<Result>
  async _remove (id: NullableId, params: ServiceParams = {} as ServiceParams): Promise<Result | Result[]> {
    if (id === null && !this.allowsMulti('remove', params)) {
      throw new MethodNotAllowed('Can not remove multiple entries')
    }

    const Model = this.ModelWithScope(params);
    const sequelize = this.paramsToAdapter(id, params);

    if (id === null) {
      const $select = sequelize.returning === false
        ? [this.id]
        : params?.query?.$select

      const current = await this._find({
        ...params,
        paginate: false,
        query: { ...params.query, $select }
      });

      if (!current.length) {
        return [];
      }

      const ids: Id[] = current.map((item: any) => item[this.id]);

      await Model.destroy({
        ...params.sequelize,
        where: { [this.id]: ids.length === 1 ? ids[0] : { [this.Op.in]: ids } }
      }).catch(errorHandler);

      if (sequelize.returning === false) {
        return [];
      }

      return current;
    }

    const result = await this._get(id, params);

    const instance = result instanceof Model ? result : Model.build(result as any, { isNewRecord: false });

    await instance.destroy(sequelize);

    return result;
  }
}
