const errors = require('@feathersjs/errors');
const { _ } = require('@feathersjs/commons');
const { select, AdapterService } = require('@feathersjs/adapter-commons');

const hooks = require('./hooks');
const utils = require('./utils');

const defaultOperators = Op => {
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

class Service extends AdapterService {
  constructor (options) {
    let Sequelize;
    if (options.Model) {
      Sequelize = options.Model.sequelize.Sequelize;
    } else if (options.Sequelize) {
      Sequelize = options.Sequelize;
    } else {
      throw new Error('You must provide a Sequelize Model or the Sequelize class');
    }

    const defaultOps = defaultOperators(Sequelize.Op);
    const operators = Object.assign(defaultOps, options.operators);
    const whitelist = Object.keys(operators).concat(options.whitelist || []);
    const { primaryKeyAttributes } = options.Model;
    const id = typeof primaryKeyAttributes === 'object' && primaryKeyAttributes[0] !== undefined
      ? primaryKeyAttributes[0] : 'id';

    super(Object.assign({ id }, options, { operators, whitelist }));
    this.raw = options.raw !== false;
  }

  get Op () {
    return this.options.Model.sequelize.Sequelize.Op;
  }

  get Model () {
    if (!this.options.Model) {
      throw new Error('The Model getter was called with no Model provided in options!');
    }

    return this.options.Model;
  }

  getModel (params) {
    if (!this.options.Model) {
      throw new Error('getModel was called without a Model present in the constructor options and without overriding getModel! Perhaps you intended to override getModel in a child class?');
    }

    return this.options.Model;
  }

  applyScope (params = {}) {
    if ((params.sequelize || {}).scope) {
      return this.getModel(params).scope(params.sequelize.scope);
    }
    return this.getModel(params);
  }

  filterQuery (params = {}) {
    const filtered = super.filterQuery(params);
    const operators = this.options.operators;
    const convertOperators = query => {
      if (Array.isArray(query)) {
        return query.map(convertOperators);
      }

      if (!utils.isPlainObject(query)) {
        return query;
      }

      const converted = Object.keys(query).reduce((result, prop) => {
        const value = query[prop];
        const key = operators[prop] ? operators[prop] : prop;

        result[key] = convertOperators(value);

        return result;
      }, {});

      Object.getOwnPropertySymbols(query).forEach(symbol => {
        converted[symbol] = query[symbol];
      });

      return converted;
    };

    filtered.query = convertOperators(filtered.query);

    return filtered;
  }

  // returns either the model intance for an id or all unpaginated
  // items for `params` if id is null
  _getOrFind (id, params = {}) {
    if (id === null) {
      return this._find(Object.assign(params, {
        paginate: false
      }));
    }

    return this._get(id, params);
  }

  _find (params = {}) {
    const { filters, query: where, paginate } = this.filterQuery(params);
    const order = utils.getOrder(filters.$sort);

    const q = Object.assign({
      where,
      order,
      limit: filters.$limit,
      offset: filters.$skip,
      raw: this.raw,
      distinct: true
    }, params.sequelize);

    if (filters.$select) {
      q.attributes = filters.$select;
    }

    const Model = this.applyScope(params);

    // Until Sequelize fix all the findAndCount issues, a few 'hacks' are needed to get the total count correct

    // Adding an empty include changes the way the count is done
    // See: https://github.com/sequelize/sequelize/blob/7e441a6a5ca44749acd3567b59b1d6ceb06ae64b/lib/model.js#L1780-L1782
    q.include = q.include || [];

    // Non-raw is the default but setting it manually breaks paging
    // See: https://github.com/sequelize/sequelize/issues/7931
    if (q.raw === false) {
      delete q.raw;
    }

    if (paginate && paginate.default) {
      return Model.findAndCountAll(q).then(result => {
        return {
          total: result.count,
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data: result.rows
        };
      }).catch(utils.errorHandler);
    }

    return Model.findAll(q).catch(utils.errorHandler);
  }

  _get (id, params = {}) {
    const { query: where } = this.filterQuery(params);

    // Attach 'where' constraints, if any were used.
    const q = Object.assign({
      raw: this.raw,
      where: Object.assign({
        [this.Op.and]: { [this.id]: id }
      }, where)
    }, params.sequelize);

    const Model = this.applyScope(params);

    // findById calls findAll under the hood. We use findAll so that
    // eager loading can be used without a separate code path.
    return Model.findAll(q).then(result => {
      if (result.length === 0) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      return result[0];
    }).then(select(params, this.id)).catch(utils.errorHandler);
  }

  _create (data, params = {}) {
    const options = Object.assign({ raw: this.raw }, params.sequelize);
    // Model.create's `raw` option is different from other methods.
    // In order to use `raw` consistently to serialize the result,
    // we need to shadow the Model.create use of raw, which we provide
    // access to by specifying `ignoreSetters`.
    const ignoreSetters = Boolean(options.ignoreSetters);
    const createOptions = Object.assign({
      returning: true
    }, options, { raw: ignoreSetters });
    const isArray = Array.isArray(data);
    const Model = this.applyScope(params);
    const promise = isArray ? Model.bulkCreate(data, createOptions)
      : Model.create(data, createOptions);

    return promise.then(result => {
      const sel = select(params, this.id);
      if (options.raw === false) {
        return result;
      }
      if (isArray) {
        return result.map(item => sel(item.toJSON()));
      }
      return sel(result.toJSON());
    }).catch(utils.errorHandler);
  }

  _patch (id, data, params = {}) {
    const Model = this.applyScope(params);

    // Get a list of ids that match the id/query. Overwrite the
    // $select because only the id is needed for this idList
    const idQuery = Object.assign({}, params.query, { $select: [this.id] });
    const idParams = Object.assign({}, params, { query: idQuery });

    const ids = this._getOrFind(id, idParams).then(result => {
      const items = Array.isArray(result) ? result : [result];
      return items.map(item => item[this.id]);
    });

    return ids.then(idList => {
      // Create a new query that re-queries all ids that
      // were originally changed
      const findQuery = Object.assign(
        { [this.id]: { $in: idList } },
        this.filterQuery(params).filters
      );

      const findParams = Object.assign({}, params, { query: findQuery });

      const seqOptions = Object.assign(
        { raw: this.raw },
        params.sequelize,
        { where: { [this.id]: { [this.Op.in]: idList } } }
      );

      return Model.update(_.omit(data, this.id), seqOptions)
        .then(() => {
          if (params.$returning !== false) {
            return this._getOrFind(id, findParams);
          } else {
            return Promise.resolve([]);
          }
        });
    }).then(select(params, this.id)).catch(utils.errorHandler);
  }

  _update (id, data, params = {}) {
    const where = Object.assign({}, this.filterQuery(params).query);

    // Force the {raw: false} option as the instance is needed to properly
    // update
    const seqOptions = Object.assign({}, params.sequelize, { raw: false });

    return this._get(id, { sequelize: seqOptions, query: where }).then(instance => {
      const copy = Object.keys(instance.toJSON()).reduce((result, key) => {
        result[key] = typeof data[key] === 'undefined' ? null : data[key];

        return result;
      }, {});

      return instance.update(copy, seqOptions)
        .then(() => this._get(id, {
          sequelize: Object.assign({}, seqOptions, {
            raw: typeof (params.sequelize || {}).raw !== 'undefined'
              ? params.sequelize.raw
              : this.raw
          })
        }));
    })
      .then(select(params, this.id))
      .catch(utils.errorHandler);
  }

  _remove (id, params = {}) {
    const opts = Object.assign({ raw: this.raw }, params);
    const where = Object.assign({}, this.filterQuery(params).query);

    if (id !== null) {
      where[this.Op.and] = { [this.id]: id };
    }

    const options = Object.assign({}, { where }, params.sequelize);

    const Model = this.applyScope(params);

    if (params.$returning !== false) {
      return this._getOrFind(id, opts).then(data => {
        return Model.destroy(options).then(() => data);
      })
        .then(select(params, this.id))
        .catch(utils.errorHandler);
    } else {
      return Model.destroy(options).then(() => Promise.resolve([]))
        .then(select(params, this.id))
        .catch(utils.errorHandler);
    }
  }
}

const init = options => new Service(options);

// Exposed Modules
module.exports = Object.assign(init, {
  default: init,
  ERROR: utils.ERROR,
  hooks,
  Service
});
