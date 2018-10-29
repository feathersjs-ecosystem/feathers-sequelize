const omit = require('lodash.omit');
const Proto = require('uberproto');
const errors = require('@feathersjs/errors');
const { select, filterQuery } = require('@feathersjs/commons');

const utils = require('./utils');

class Service {
  constructor (options) {
    if (!options) {
      throw new Error('Sequelize options have to be provided');
    }

    if (!options.Model) {
      throw new Error('You must provide a Sequelize Model');
    }
    
    this.paginate = options.paginate || false;
    this.options = options;
    this.Model = options.Model;
    this.id = options.id || 'id';
    this.events = options.events;
    this.raw = options.raw !== false;
  }

  getModel (params) {
    return this.Model;
  }

  applyScope (params) {
    if ((params.sequelize || {}).scope) {
      return this.getModel(params).scope(params.sequelize.scope);
    }
    return this.getModel(params);
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  _find (params, getFilter = filterQuery, paginate) {
    const { filters, query } = getFilter(params.query || {});
    const where = utils.getWhere(query);
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

    if (paginate) {
      return Model.findAndCountAll(q).then(result => {
        return {
          total: result.count,
          limit: filters.$limit,
          skip: filters.$skip || 0,
          data: result.rows
        };
      }).catch(utils.errorHandler);
    } else {
      return Model.findAll(q).then(result => {
        return {
          data: result
        };
      }).catch(utils.errorHandler);
    }
  }

  find (params) {
    const paginate = (params && typeof params.paginate !== 'undefined') ? params.paginate : this.paginate;
    const result = this._find(params, where => filterQuery(where, paginate), paginate);

    if (!paginate.default) {
      return result.then(page => page.data);
    }

    return result;
  }

  _get (id, params) {
    const where = utils.getWhere(params.query);

    // Attach 'where' constraints, if any were used.
    const q = Object.assign({
      raw: this.raw,
      where: Object.assign({[this.id]: id}, where)
    }, params.sequelize);

    let Model = this.applyScope(params);

    // findById calls findAll under the hood. We use findAll so that
    // eager loading can be used without a separate code path.
    return Model.findAll(q).then(result => {
      if (result.length === 0) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      return result[0];
    })
      .then(select(params, this.id))
      .catch(error => {
        throw new errors.NotFound(`No record found for id '${id}'`, error);
      });
  }

  // returns either the model intance for an id or all unpaginated
  // items for `params` if id is null
  _getOrFind (id, params) {
    if (id === null) {
      return this._find(params).then(page => page.data);
    }

    return this._get(id, params);
  }

  get (id, params) {
    return this._get(id, params).then(select(params, this.id));
  }

  create (data, params) {
    const options = Object.assign({raw: this.raw}, params.sequelize);
    // Model.create's `raw` option is different from other methods.
    // In order to use `raw` consistently to serialize the result,
    // we need to shadow the Model.create use of raw, which we provide
    // access to by specifying `ignoreSetters`.
    const ignoreSetters = Boolean(options.ignoreSetters);
    const createOptions = Object.assign({}, options, {raw: ignoreSetters});
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

  patch (id, data, params) {
    const where = Object.assign({}, filterQuery(params.query || {}).query);
    const mapIds = page => page.data.map(current => current[this.id]);

    if (id !== null) {
      where[this.id] = id;
    }

    const options = Object.assign({raw: this.raw}, params.sequelize, { where });

    let Model = this.applyScope(params);

    // This is the best way to implement patch in sql, the other dialects 'should' use a transaction.
    if (Model.sequelize.options.dialect === 'postgres' && params.$returning !== false) {
      options.returning = true;

      return this._getOrFind(id, params)
        .then(results => this.getModel(params).update(omit(data, this.id), options))
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

    return ids
      .then(idList => {
        // Create a new query that re-queries all ids that
        // were originally changed
        const findParams = Object.assign({}, params, {
          query: { [this.id]: { $in: idList } }
        });

        return Model.update(omit(data, this.id), options)
          .then(() => {
            if (params.$returning !== false) {
              return this._getOrFind(id, findParams);
            } else {
              return Promise.resolve([]);
            }
          });
      })
      .then(select(params, this.id))
      .catch(utils.errorHandler);
  }

  update (id, data, params) {
    const where = Object.assign({}, filterQuery(params.query || {}).query);
    const options = Object.assign({ raw: this.raw }, params.sequelize);

    if (Array.isArray(data)) {
      return Promise.reject(new errors.BadRequest('Not replacing multiple records. Did you mean `patch`?'));
    }

    // Force the {raw: false} option as the instance is needed to properly
    // update
    const updateOptions = Object.assign({ raw: false }, params.sequelize);

    return this._get(id, { sequelize: { raw: false }, query: where }).then(instance => {
      if (!instance) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      let copy = {};
      Object.keys(instance.toJSON()).forEach(key => {
        if (typeof data[key] === 'undefined') {
          copy[key] = null;
        } else {
          copy[key] = data[key];
        }
      });

      return instance.update(copy, updateOptions).then(() => this._get(id, {sequelize: options}));
    })
      .then(select(params, this.id))
      .catch(utils.errorHandler);
  }

  remove (id, params) {
    const opts = Object.assign({ raw: this.raw }, params);
    const where = Object.assign({}, filterQuery(params.query || {}).query);

    if (id !== null) {
      where[this.id] = id;
    }

    const options = Object.assign({}, params.sequelize, { where });

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

function init (options) {
  return new Service(options);
}

module.exports = init;

// Exposed Modules
Object.assign(module.exports, {
  default: init,
  Service
});
