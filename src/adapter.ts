import { BadRequest, MethodNotAllowed, NotFound } from '@feathersjs/errors';
import { _ } from '@feathersjs/commons';
import { select, AdapterBase, filterQuery } from '@feathersjs/adapter-commons';
import type { PaginationOptions } from '@feathersjs/adapter-commons';
import type { SequelizeAdapterOptions, SequelizeAdapterParams } from './declarations';
import type { Id, NullableId, Paginated, Query } from '@feathersjs/feathers';
import { errorHandler, getOrder, isPlainObject, isEmpty } from './utils';
import { Op } from 'sequelize';
import type { CreateOptions, FindOptions, Model } from 'sequelize';

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
  $returning: (value: any) => {
    if (value === true || value === false || value === undefined) {
      return value;
    }

    throw new BadRequest('Invalid $returning filter value');
  },
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

  /**
   * @deprecated use 'service.ModelWithScope' instead. 'applyScope' will be removed in a future release.
   */
  applyScope (params?: ServiceParams) {
    const Model = this.getModel(params);
    if (params?.sequelize?.scope) {
      return Model.scope(params.sequelize.scope);
    }
    return Model;
  }

  ModelWithScope (params: ServiceParams) {
    return this.applyScope(params);
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

  paramsToAdapter (id: NullableId, _params?: ServiceParams): FindOptions {
    const params = _params || {} as ServiceParams;
    const { filters, query: where } = this.filterQuery(params);

    if (id === null) {
      const sequelize: FindOptions = {
        where,
        order: getOrder(filters.$sort),
        limit: filters.$limit,
        offset: filters.$skip,
        attributes: filters.$select,
        raw: this.raw,
        distinct: true,
        ...params.sequelize
      };

      // Until Sequelize fix all the findAndCount issues, a few 'hacks' are needed to get the total count correct

      // Adding an empty include changes the way the count is done
      // See: https://github.com/sequelize/sequelize/blob/7e441a6a5ca44749acd3567b59b1d6ceb06ae64b/lib/model.js#L1780-L1782
      sequelize.include = sequelize.include || [];

      return sequelize;
    }

    const sequelize: FindOptions = {
      where,
      order: getOrder(filters.$sort),
      limit: 1,
      attributes: filters.$select,
      raw: this.raw,
      ...params.sequelize
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

  /**
   * returns either the model instance / jsonified object for an id or all unpaginated
   * items for `params` if id is null
   *
   * @deprecated Use `_get` or `_find` instead. `_getOrFind` will be removed in a future release.
   */
  async _getOrFind (id: Id, _params?: ServiceParams): Promise<Result>
  async _getOrFind (id: null, _params?: ServiceParams): Promise<Result[]>
  async _getOrFind (id: NullableId, _params: ServiceParams) {
    const params = _params || {} as ServiceParams;
    if (id === null) {
      return await this._find({
        ...params,
        paginate: false
      });
    }

    return await this._get(id, params);
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
      return result as Result[];
    }

    if (sequelize.limit === 0) {
      const total = await Model
        .count({ ...sequelize, attributes: undefined })
        .catch(errorHandler);

      return {
        total,
        limit: sequelize.limit,
        skip: sequelize.offset || 0,
        data: [] as Result[]
      }
    }

    const result = await Model.findAndCountAll(sequelize).catch(errorHandler);

    return {
      total: result.count,
      limit: sequelize.limit,
      skip: sequelize.offset || 0,
      data: result.rows as Result[]
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

    if (isArray && !this.allowsMulti('create', params)) {
      throw new MethodNotAllowed('Can not create multiple entries')
    }

    if (isArray && data.length === 0) {
      return []
    }

    const sequelize = {
      ...params.sequelize,
      returning:  typeof params.sequelize?.returning === 'boolean'
        ? params.sequelize.returning
        : true,
      raw: typeof params.sequelize?.raw === 'boolean'
        ? params.sequelize.raw
        : this.raw
    };

    const Model = this.ModelWithScope(params);

    if (isArray) {
      const result = await Model
        .bulkCreate(data as any[], sequelize)
        .catch(errorHandler);

      if (!sequelize.returning) {
        return [] as Result[];
      }

      if (sequelize.raw) {
        return select(params, this.id)((result as Model[]).map(
          item => item.toJSON()
        )) as Result[];
      }

      return result as Result[];
    }

    const result = await Model
      .create(data as any, sequelize as CreateOptions)
      .catch(errorHandler);

    // TODO: Disable returning for single create?
    if (!sequelize.returning) {
      return null
    }

    if (sequelize.raw) {
      return select(params, this.id)((result as Model).toJSON())
    }

    return result as Result;
  }

  async _patch (id: null, data: PatchData, params?: ServiceParams): Promise<Result[]>
  async _patch (id: Id, data: PatchData, params?: ServiceParams): Promise<Result>
  async _patch (id: NullableId, data: PatchData, params: ServiceParams = {} as ServiceParams): Promise<Result | Result[]> {
    if (id === null && !this.allowsMulti('patch', params)) {
      throw new MethodNotAllowed('Can not patch multiple entries')
    }

    const Model = this.ModelWithScope(params);

    if (id === null) {
      const items = await this._find({
        ...params,
        paginate: false,
        query: {
          ...params?.query,
          $select: [this.id]
        }
      })

      if (!items.length) {
        return []
      }

      const ids: Id[] = items.map((item: any) => item[this.id]);

      await Model.update(_.omit(data, this.id), {
        raw: this.raw,
        ...params.sequelize,
        where: { [this.id]: ids.length === 1 ? ids[0] : { [this.Op.in]: ids } }
      }).catch(errorHandler);

      if (params.$returning === false) {
        return [];
      }

      const result = await this._find({
        ...params,
        paginate: false,
        query: {
          [this.id]: ids.length === 1 ? ids[0] : { $in: ids },
          $select: params?.query?.$select
        }
      });

      return result;
    }

    await this._get(id, {
      ...params,
      query: {
        ...params?.query,
        $select: [this.id]
      }
    });

    await Model.update(_.omit(data, this.id), {
      raw: this.raw,
      ...params.sequelize,
      where: { [this.id]: id }
    }).catch(errorHandler);

    const result = await this._get(id, {
      ...params,
      query: { $select: params?.query?.$select  }
    });

    return result
  }

  async _update (id: Id, data: Data, params: ServiceParams = {} as ServiceParams): Promise<Result> {
    const Model = this.ModelWithScope(params);
    const sequelize = this.paramsToAdapter(id, params);

    const values = Object.values(Model.getAttributes())
      .reduce((item, attribute: any) => {
        const key = attribute.fieldName as string;
        if (key === this.id) {
          // @ts-ignore
          item[key] = id;
          return item
        }
        // @ts-ignore
        item[key] = key in data ? data[key] : null;
        return item;
      }, {});

    const raw = typeof params.sequelize?.raw === 'boolean'
      ? params.sequelize.raw
      : this.raw;

    const total = await Model
      .count({ ...sequelize, attributes: undefined })
      .catch(errorHandler);

    if (!total) {
      throw new NotFound(`No record found for id '${id}'`);
    }

    const instance = await Model
      .build(values, { isNewRecord: false })
      .update(values, sequelize)
      .catch(errorHandler);

    if (!isEmpty(sequelize.include)) {
      return this._get(id, {
        ...params,
        query: { $select: params.query?.$select }
      });
    }

    if (!isEmpty(sequelize.attributes)) {
      const values = select(params, this.id)(instance.toJSON())
      if (raw) {
        return values as Result;
      }
      return Model.build(values, { isNewRecord: false }) as Result;
    }

    if (raw) {
      return instance.toJSON() as Result;
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

    if (id === null) {
      const $select = params.$returning === false
        ? [this.id]
        : params?.query?.$select

      const items = await this._find({
        ...params,
        paginate: false,
        query: { ...params.query, $select }
      });

      if (!items.length) {
        return []
      }

      const ids: Id[] = items.map((item: any) => item[this.id]);

      await Model.destroy({
        raw: this.raw,
        ...params.sequelize,
        where: { [this.id]: ids.length === 1 ? ids[0] : { [this.Op.in]: ids } }
      }).catch(errorHandler);

      if (params.$returning === false) {
        return [];
      }

      return items;
    }

    const item = await this._get(id, params);

    await Model.destroy({
      raw: this.raw,
      ...params.sequelize,
      where: { [this.id]: id }
    }).catch(errorHandler);

    return item
  }
}
