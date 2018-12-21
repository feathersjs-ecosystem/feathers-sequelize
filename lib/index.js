const errors = require('@feathersjs/errors');
const { _ } = require('@feathersjs/commons');
const { select, AdapterService } = require('@feathersjs/adapter-commons');

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
    $iLike: Op.ilike,
    $notILike: Op.notILike,
    $or: Op.or,
    $and: Op.and
  };
};

class Service extends AdapterService {
  constructor (options) {
    if (!options.Model) {
      throw new Error('You must provide a Sequelize Model');
    }

    const defaultOps = defaultOperators(options.Model.sequelize.Op);
    const operators = Object.assign(defaultOps, options.operators);
    const whitelist = Object.keys(operators).concat(options.whitelist || []);

    super(Object.assign({
      id: 'id',
      operators,
      whitelist
    }, options));
    this.raw = options.raw !== false;
  }

  get Model () {
    return this.getModel();
  }

  getModel (params) {
    return this.options.Model;
  }

  applyScope (params) {
    if ((params.sequelize || {}).scope) {
      return this.getModel(params).scope(params.sequelize.scope);
    }
    return this.getModel(params);
  }

  filterQuery (params) {
    const filtered = super.filterQuery(params);
    const operators = this.options.operators;
    const convertOperators = query => {
      if (Array.isArray(query)) {
        return query.map(convertOperators);
      }

      if (!_.isObject(query)) {
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
  _getOrFind (id, params) {
    if (id === null) {
      return this._find(Object.assign(params, {
        paginate: false
      }));
    }

    return this._get(id, params);
  }

  _find (params) {
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

    let Model = this.applyScope(params);

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

  _get (id, params) {
    const { query: where } = this.filterQuery(params);

    // Attach 'where' constraints, if any were used.
    const q = Object.assign({
      raw: this.raw,
      where: Object.assign({ [this.id]: id }, where)
    }, params.sequelize);

    let Model = this.applyScope(params);

    // findById calls findAll under the hood. We use findAll so that
    // eager loading can be used without a separate code path.
    return Model.findAll(q).then(result => {
      if (result.length === 0) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      return result[0];
    }).then(select(params, this.id)).catch(utils.errorHandler);
  }

  _create (data, params) {
    const options = Object.assign({ raw: this.raw }, params.sequelize);
    // Model.create's `raw` option is different from other methods.
    // In order to use `raw` consistently to serialize the result,
    // we need to shadow the Model.create use of raw, which we provide
    // access to by specifying `ignoreSetters`.
    const ignoreSetters = Boolean(options.ignoreSetters);
    const createOptions = Object.assign({}, options, { raw: ignoreSetters });
    const isArray = Array.isArray(data);
    let promise;

    let Model = this.applyScope(params);

    if (isArray) {
      promise = Model.bulkCreate(data, createOptions);
    } else {
      promise = Model.create(data, createOptions);
    }

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

  _patch (id, data, params) {
    const where = Object.assign({}, this.filterQuery(params).query);
    const mapIds = data => data.map(current => current[this.id]);

    if (id !== null) {
      where[this.id] = id;
    }

    const options = Object.assign({ raw: this.raw }, params.sequelize, { where });

    let Model = this.applyScope(params);

    // This is the best way to implement patch in sql, the other dialects 'should' use a transaction.
    if (Model.sequelize.options.dialect === 'postgres' && params.$returning !== false) {
      options.returning = true;

      return this._getOrFind(id, params)
        .then(results => this.getModel(params).update(_.omit(data, this.id), options))
        .then(results => {
          if (id === null) {
            return results[1];
          }

          if (!results[1].length) {
            throw new errors.NotFound(`No record found for id '${id}'`);
          }

          return results[1][0];
        })
        .then(select(params, this.id))
        .catch(utils.errorHandler);
    }

    // By default we will just query for the one id. For multi patch
    // we create a list of the ids of all items that will be changed
    // to re-query them after the update
    const ids = id === null ? this._find(params)
      .then(mapIds) : Promise.resolve([ id ]);

    return ids.then(idList => {
      // Create a new query that re-queries all ids that
      // were originally changed
      const findParams = Object.assign({}, params, Object.assign({}, {
        query: Object.assign({ [this.id]: { $in: idList } }, params.query)
      }));

      return Model.update(_.omit(data, this.id), options)
        .then(() => {
          if (params.$returning !== false) {
            return this._getOrFind(id, findParams);
          } else {
            return Promise.resolve([]);
          }
        });
    }).then(select(params, this.id)).catch(utils.errorHandler);
  }

  _update (id, data, params) {
    const where = Object.assign({}, this.filterQuery(params).query);
    const options = Object.assign({ raw: this.raw }, params.sequelize);

    // Force the {raw: false} option as the instance is needed to properly
    // update
    const updateOptions = Object.assign({}, params.sequelize, params, { raw: false });
    const getOptions = Object.assign({}, params, { query: where, sequelize: { raw: false } });

    return this._get(id, getOptions).then(instance => {
      const copy = Object.keys(instance.toJSON()).reduce((result, key) => {
        result[key] = typeof data[key] === 'undefined' ? null : data[key];

        return result;
      }, {});

      const instanceGetOptions = Object.assign({}, params, { sequelize: options });
      // We just want to return the updated record here, no questions asked!
      // Therefore, we must remove any custom query specified in the update call.
      delete instanceGetOptions.query;

      return instance.update(copy, updateOptions).then(() => this._get(id, instanceGetOptions));
    })
      .then(select(params, this.id))
      .catch(utils.errorHandler);
  }

  _remove (id, params) {
    const opts = Object.assign({ raw: this.raw }, params);
    const where = Object.assign({}, this.filterQuery(params).query);

    if (id !== null) {
      where[this.id] = id;
    }

    const options = Object.assign({}, { where }, params.sequelize);

    let Model = this.applyScope(params);

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
  Service
});
