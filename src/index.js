if(!global._babelPolyfill) { require('babel-polyfill'); }

import Proto from 'uberproto';
import filter from 'feathers-query-filters';
import errors from 'feathers-errors';
import * as utils from './utils';

class Service {
  constructor(options) {
    this.paginate = options.paginate || {};
    this.Model = options.Model;
    this.id = options.id || 'id';
  }

  extend(obj) {
    return Proto.extend(obj, this);
  }

  find(params) {
    let where = utils.getWhere(params.query);
    let filters = filter(where);
    let order = utils.getOrder(filters.$sort);
    let query = {
      where, order,
      limit: filters.$limit,
      offset: filters.$skip,
      attributes: filters.$select || null
    };

    if (this.paginate.default) {
      const limit = Math.min(filters.$limit || this.paginate.default,
        this.paginate.max || Number.MAX_VALUE);

      query.limit = limit;

      return this.Model.findAndCount(query).then(result => {
        return {
          total: result.count,
          limit,
          skip: filters.$skip || 0,
          data: result.rows
        };
      }).catch(utils.errorHandler);
    }

    return this.Model.findAll(query).catch(utils.errorHandler);
  }

  get(id) {
    return this.Model.findById(id).then(instance => {
      if(!instance) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      return instance;
    })
    .catch(utils.errorHandler);
  }

  create(data) {
    if (Array.isArray(data)) {
      return this.Model.bulkCreate(data).catch(utils.errorHandler);
    }

    return this.Model.create(data).catch(utils.errorHandler);
  }

  patch(id, data, params) {
    const where = Object.assign({}, params.query);

    if(id !== null) {
      where[this.id] = id;
    }

    delete data[this.id];

    return this.Model.update(data, { where }).then(() => {
      if(id === null) {
        return this.find(params);
      }

      return this.get(id, params);
    })
    .catch(utils.errorHandler);
  }

  update(id, data) {
    if(Array.isArray(data)) {
      return Promise.reject('Not replacing multiple records. Did you mean `patch`?');
    }

    delete data[this.id];

    return this.Model.findById(id).then(instance => {
      if(!instance) {
        throw new errors.NotFound(`No record found for id '${id}'`);
      }

      let copy = {};
      Object.keys(instance.toJSON()).forEach(key => {
        if(typeof data[key] === 'undefined') {
          copy[key] = null;
        } else {
          copy[key] = data[key];
        }
      });

      return instance.update(copy);
    })
    .catch(utils.errorHandler);
  }

  remove(id, params) {
    const promise = id === null ? this.find(params) : this.get(id);

    return promise.then(data => {
      const where = Object.assign({}, params.query);

      if(id !== null) {
        where.id = id;
      }

      return this.Model.destroy({ where }).then(() => data);
    })
    .catch(utils.errorHandler);
  }
}

export default function init(Model) {
  return new Service(Model);
}

init.Service = Service;
