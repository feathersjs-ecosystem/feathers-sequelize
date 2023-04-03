import { BadRequest, MethodNotAllowed, NotFound } from '@feathersjs/errors';
import { _ } from '@feathersjs/commons';
import { select, AdapterBase, filterQuery } from '@feathersjs/adapter-commons';
import type { PaginationOptions } from '@feathersjs/adapter-commons';
import type { SequelizeAdapterOptions, SequelizeAdapterParams } from './declarations';
import type { Id, NullableId, Paginated, Query } from '@feathersjs/feathers';
import { errorHandler, getOrder, isPlainObject } from './utils';
import { Op } from 'sequelize';
import type { CreateOptions, FindOptions, Model } from 'sequelize';

const defaultOpMap = () => {
  return {
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
};

const defaultFilters = () => {
  return {
    $returning: (value: any) => {
      if (value === true || value === false || value === undefined) {
        return value;
      }

      throw new BadRequest('Invalid $returning filter value');
    },
    $and: true
  }
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

    const operatorMap = Object.assign(defaultOpMap(), options.operatorMap);
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

    const filters = Object.assign(defaultFilters(), options.filters);

    super(Object.assign({ id }, options, { operatorMap, filters, operators }));
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

    return {
      filters,
      query,
      paginate: options.paginate
    }
  }

  paramsToAdapter (id: NullableId, _params?: ServiceParams): FindOptions {
    const params = _params || {} as ServiceParams;
    if (id) {
      const { query: where } = this.filterQuery(params);

      const { and } = this.Op;
      // Attach 'where' constraints, if any were used.
      const q: FindOptions = Object.assign({
        raw: this.raw,
        where: Object.assign(where, {
          [and]: where[and] ? [...where[and], { [this.id]: id }] : { [this.id]: id }
        })
      }, params.sequelize);

      return q;
    } else {
      const { filters, query: where } = this.filterQuery(params);
      const order = getOrder(filters.$sort);

      const q: FindOptions = Object.assign({
        where,
        order,
        limit: filters.$limit,
        offset: filters.$skip,
        raw: this.raw,
        distinct: true
      }, params.sequelize);

      if (filters.$select) {
        // Add the id to the select if it is not already there
        if (!filters.$select.includes(this.id)) {
          filters.$select.push(this.id);
        }

        q.attributes = filters.$select.map((select: any) => `${select}`);
      }

      // Until Sequelize fix all the findAndCount issues, a few 'hacks' are needed to get the total count correct

      // Adding an empty include changes the way the count is done
      // See: https://github.com/sequelize/sequelize/blob/7e441a6a5ca44749acd3567b59b1d6ceb06ae64b/lib/model.js#L1780-L1782
      q.include = q.include || [];

      return q;
    }
  }

  /**
   * returns either the model instance / jsonified object for an id or all unpaginated
   * items for `params` if id is null
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
    const { paginate } = this.filterQuery(params);

    const Model = this.ModelWithScope(params);
    const q = this.paramsToAdapter(null, params);

    try {
      if (paginate && paginate.default) {
        const result = await Model.findAndCountAll(q);

        return {
          total: result.count,
          limit: q.limit,
          skip: q.offset || 0,
          data: result.rows as Result[]
        }
      }

      return await Model.findAll(q) as Result[];
    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _get (id: Id, params: ServiceParams = {} as ServiceParams): Promise<Result> {
    const Model = this.ModelWithScope(params);
    const q = this.paramsToAdapter(id, params);

    // findById calls findAll under the hood. We use findAll so that
    // eager loading can be used without a separate code path.
    try {
      const result = await Model.findAll(q);

      if (result.length === 0) {
        throw new NotFound(`No record found for id '${id}'`);
      }

      const item = result[0];

      return select(params, this.id)(item);
    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _create (data: Data, params?: ServiceParams): Promise<Result>
  async _create (data: Data[], params?: ServiceParams): Promise<Result[]>
  async _create (data: Data | Data[], params?: ServiceParams): Promise<Result | Result[]>
  async _create (data: Data | Data[], params: ServiceParams = {} as ServiceParams): Promise<Result | Result[]> {
    if (Array.isArray(data) && !this.allowsMulti('create', params)) {
      throw new MethodNotAllowed('Can not create multiple entries')
    }

    const options = Object.assign({ raw: this.raw }, params.sequelize);
    // Model.create's `raw` option is different from other methods.
    // In order to use `raw` consistently to serialize the result,
    // we need to shadow the Model.create use of raw, which we provide
    // access to by specifying `ignoreSetters`.
    const ignoreSetters = !!options.ignoreSetters;
    const createOptions = Object.assign({
      returning: true
    }, options, { raw: ignoreSetters });
    const isArray = Array.isArray(data);
    const Model = this.ModelWithScope(params);

    try {
      const result = isArray
        ? await Model.bulkCreate(data as any[], createOptions)
        : await Model.create(data as any, createOptions as CreateOptions);

      const sel = select(params, this.id);
      if (options.raw === false) {
        return result as Result | Result[];
      }
      if (isArray) {
        return (result as Model[]).map(item => sel(item.toJSON()));
      }
      return sel((result as Model).toJSON());
    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _patch (id: null, data: PatchData, params?: ServiceParams): Promise<Result[]>
  async _patch (id: Id, data: PatchData, params?: ServiceParams): Promise<Result>
  async _patch (id: NullableId, data: PatchData, params: ServiceParams = {} as ServiceParams): Promise<Result | Result[]> {
    if (id === null && !this.allowsMulti('patch', params)) {
      throw new MethodNotAllowed('Can not patch multiple entries')
    }

    const Model = this.ModelWithScope(params);

    // Get a list of ids that match the id/query. Overwrite the
    // $select because only the id is needed for this idList
    const itemOrItems = await this._getOrFind(id, {
      ...params,
      query: {
        ...params?.query,
        $select: [this.id]
      }
    })

    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    const ids: Id[] = items.map(item => item[this.id]);

    try {
      const seqOptions = Object.assign(
        { raw: this.raw },
        params.sequelize,
        { where: { [this.id]: { [this.Op.in]: ids } } }
      );

      await Model.update(_.omit(data, this.id), seqOptions);

      if (params.$returning === false) {
        return Promise.resolve([]);
      }

      // Create a new query that re-queries all ids that
      // were originally changed
      const findParams = {
        ...params,
        query: {
          [this.id]: { $in: ids },
          ...(params?.query?.$select ? { $select: params?.query?.$select } : {})
        }
      }

      const result = await this._getOrFind(id, findParams);

      return select(params, this.id)(result);

    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _update (id: Id, data: Data, params: ServiceParams = {} as ServiceParams): Promise<Result> {
    const query = Object.assign({}, this.filterQuery(params).query);

    // Force the {raw: false} option as the instance is needed to properly update
    const seqOptions = Object.assign({}, params.sequelize, { raw: false });

    const instance = await this._get(id, { sequelize: seqOptions, query } as ServiceParams) as Model

    const itemToUpdate = Object.keys(instance.toJSON()).reduce((result: Record<string, any>, key) => {
      // @ts-ignore
      result[key] = key in data ? data[key] : null;

      return result;
    }, {});

    try {
      await instance.update(itemToUpdate, seqOptions);

      const item = await this._get(id, {
        sequelize: Object.assign({}, seqOptions, {
          raw: typeof params?.sequelize?.raw === 'boolean'
            ? params.sequelize.raw
            : this.raw
        })
      } as ServiceParams);

      return select(params, this.id)(item);
    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _remove (id: null, params?: ServiceParams): Promise<Result[]>
  async _remove (id: Id, params?: ServiceParams): Promise<Result>
  async _remove (id: NullableId, params: ServiceParams = {} as ServiceParams): Promise<Result | Result[]> {
    if (id === null && !this.allowsMulti('remove', params)) {
      throw new MethodNotAllowed('Can not remove multiple entries')
    }

    const Model = this.ModelWithScope(params);

    const findParams = { ...params };
    if (params.$returning === false) {
      findParams.query = {
        ...findParams.query,
        $select: [this.id]
      }
    } else if (params.query?.$select) {
      findParams.query = {
        ...findParams.query,
        $select: [...params.query.$select, this.id]
      }
    }

    const itemOrItems = await this._getOrFind(id, findParams);
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    const ids: Id[] = items.map(item => item[this.id]);
    const seqOptions = Object.assign(
      { raw: this.raw },
      params.sequelize,
      { where: { [this.id]: { [this.Op.in]: ids } } }
    );

    try {
      await Model.destroy(seqOptions);
      if (params.$returning === false) {
        return []
      }
      return select(params, this.id)(itemOrItems);
    } catch (err: any) {
      return errorHandler(err);
    }
  }
}
