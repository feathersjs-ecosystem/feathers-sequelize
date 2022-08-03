import errors from '@feathersjs/errors';
import { _ } from '@feathersjs/commons';
import { select, AdapterService } from '@feathersjs/adapter-commons';
import type { FilteredQuery, SequelizeServiceOptions, SequelizeServiceProvidedOptions } from './types';
import type { Id, NullableId, Paginated, Params, Query } from '@feathersjs/feathers';
import { errorHandler, getOrder, isPlainObject } from './utils';
import type { CreateOptions, FindOptions, Model } from 'sequelize';

const defaultOperators = (Op: any) => {
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

export class Service<
  T extends Record<string, any> = Record<string, any>,
  M extends Model = Model,
> extends AdapterService<T> {
  options: SequelizeServiceOptions<M>;

  constructor (options: SequelizeServiceProvidedOptions<M>) {
    if (!options.Model) {
      throw new Error('You must provide a Sequelize Model or the Sequelize class');
    }

    const { Sequelize } = options.Model.sequelize;

    // @ts-ignore
    const defaultOps = defaultOperators(Sequelize.Op);
    const operators = Object.assign(defaultOps, options.operators);
    const whitelist = Object.keys(operators).concat(options.whitelist || []);
    const { primaryKeyAttributes } = options.Model;
    const id = typeof primaryKeyAttributes === 'object' && primaryKeyAttributes[0] !== undefined
      ? primaryKeyAttributes[0]
      : 'id';

    super(Object.assign({ id }, options, { operators, whitelist }));
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
  getModel (_params?: Params) {
    if (!this.options.Model) {
      throw new Error('getModel was called without a Model present in the constructor options and without overriding getModel! Perhaps you intended to override getModel in a child class?');
    }

    return this.options.Model;
  }

  /**
   * @deprecated use 'service.ModelWithScope' instead. 'applyScope' will be removed in a future release.
   */
  applyScope (params?: Params) {
    const Model = this.getModel(params);
    if (params?.sequelize?.scope) {
      return Model.scope(params.sequelize.scope);
    }
    return Model;
  }

  ModelWithScope (params: Params) {
    return this.applyScope(params);
  }

  convertOperators (q: any): Query {
    if (Array.isArray(q)) {
      return q.map(subQuery => this.convertOperators(subQuery));
    }

    if (!isPlainObject(q)) {
      return q;
    }

    const { operators } = this.options;

    const converted: Record<string | symbol, any> = Object.keys(q).reduce((result: Record<string, any>, prop) => {
      const value = q[prop];
      const key = operators[prop] ? operators[prop] : prop;

      result[key] = this.convertOperators(value);

      return result;
    }, {});

    Object.getOwnPropertySymbols(q).forEach(symbol => {
      converted[symbol] = q[symbol];
    });

    return converted;
  }

  filterQuery (params: Params = {}): FilteredQuery {
    const filtered = super.filterQuery(params) as FilteredQuery;

    filtered.query = Object.assign({}, this.convertOperators(filtered.query));

    return filtered;
  }

  paramsToAdapter (id: NullableId, params: Params = {}): FindOptions {
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
  async _getOrFind (id: Id, params?: Params): Promise<T>
  async _getOrFind (id: null, params?: Params): Promise<T[]>
  async _getOrFind (id: NullableId, params: Params = {}) {
    if (id === null) {
      return await this._find(Object.assign(params, {
        paginate: false
      }));
    }

    return await this._get(id, params);
  }


  async _find (params: Params = {}): Promise<T[] | Paginated<T>> {
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
          data: result.rows as T[]
        }
      }

      return await Model.findAll(q) as T[];
    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _get (id: Id, params: Params = {}): Promise<T> {
    const Model = this.ModelWithScope(params);
    const q = this.paramsToAdapter(id, params);

    // findById calls findAll under the hood. We use findAll so that
    // eager loading can be used without a separate code path.
    try {
      const result = await Model.findAll(q);

      if (result.length === 0) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      const item = result[0];

      return select(params, this.id)(item);
    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _create (data: Partial<T>, params?: Params): Promise<T>
  async _create (data: Partial<T>[], params?: Params): Promise<T[]>
  async _create (data: Partial<T> | Partial<T>[], params: Params = {}): Promise<T | T[]> {
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
        return result as T | T[];
      }
      if (isArray) {
        return (result as M[]).map(item => sel(item.toJSON()));
      }
      return sel((result as M).toJSON());
    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _patch (id: Id, data: Partial<T>, params?: Params): Promise<T>
  async _patch (id: null, data: Partial<T>, params?: Params): Promise<T[]>
  async _patch (id: NullableId, data: Partial<T>, params: Params = {}): Promise<T | T[]> {
    const Model = this.ModelWithScope(params);

    // Get a list of ids that match the id/query. Overwrite the
    // $select because only the id is needed for this idList
    const idQuery = Object.assign({}, params.query, { $select: [this.id] });
    const idParams = Object.assign({}, params, { query: idQuery });

    const itemOrItems = await this._getOrFind(id, idParams);

    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    const ids: Id[] = items.map(item => item[this.id]);

    try {
      // Create a new query that re-queries all ids that
      // were originally changed
      const findQuery = Object.assign(
        { [this.id]: { $in: ids } },
        this.filterQuery(params).filters
      );

      const findParams = Object.assign({}, params, { query: findQuery });

      const seqOptions = Object.assign(
        { raw: this.raw },
        params.sequelize,
        { where: { [this.id]: { [this.Op.in]: ids } } }
      );

      await Model.update(_.omit(data, this.id), seqOptions);

      if (params.$returning === false) {
        return Promise.resolve([]);
      }

      const result = await this._getOrFind(id, findParams);

      return select(params, this.id)(result);

    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _update (id: Id, data: Partial<T>, params: Params = {}) {
    const where = Object.assign({}, this.filterQuery(params).query);

    // Force the {raw: false} option as the instance is needed to properly update
    const seqOptions = Object.assign({}, params.sequelize, { raw: false });

    const instance = await this._get(id, { sequelize: seqOptions, query: where }) as M

    const itemToUpdate = Object.keys(instance.toJSON()).reduce((result: Record<string, any>, key) => {
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
      });

      return select(params, this.id)(item);
    } catch (err: any) {
      return errorHandler(err);
    }
  }

  async _remove (id: Id, params?: Params): Promise<T>
  async _remove (id: null, params?: Params): Promise<T[]>
  async _remove (id: NullableId, params: Params = {}): Promise<T | T[]> {
    const opts = Object.assign({ raw: this.raw }, params);
    const where = Object.assign({}, this.filterQuery(params).query);

    if (id !== null) {
      where[this.Op.and] = { [this.id]: id };
    }

    const options = Object.assign({}, { where }, params.sequelize);

    const Model = this.ModelWithScope(params);

    if (params.$returning !== false) {
      const items = await this._getOrFind(id, opts)
      try {
        await Model.destroy(options);
        return select(params, this.id)(items);
      } catch (err: any) {
        return errorHandler(err);
      }
    } else {
      try {
        await Model.destroy(options);
        return [];
      } catch (err: any) {
        return errorHandler(err);
      }
    }
  }
}
