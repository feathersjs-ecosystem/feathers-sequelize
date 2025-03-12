'use strict';

const errors = require('@feathersjs/errors');
const commons = require('@feathersjs/commons');
const adapterCommons = require('@feathersjs/adapter-commons');
const sequelize = require('sequelize');

const ERROR = Symbol("feathers-sequelize/error");
const wrap = (error, original) => Object.assign(error, { [ERROR]: original });
const errorHandler = (error) => {
  const { name, message } = error;
  if (name.startsWith("Sequelize")) {
    switch (name) {
      case "SequelizeValidationError":
      case "SequelizeUniqueConstraintError":
      case "SequelizeExclusionConstraintError":
      case "SequelizeForeignKeyConstraintError":
      case "SequelizeInvalidConnectionError":
        throw wrap(new errors.BadRequest(message, { errors: error.errors }), error);
      case "SequelizeTimeoutError":
      case "SequelizeConnectionTimedOutError":
        throw wrap(new errors.Timeout(message), error);
      case "SequelizeConnectionRefusedError":
      case "SequelizeAccessDeniedError":
        throw wrap(new errors.Forbidden(message), error);
      case "SequelizeHostNotReachableError":
        throw wrap(new errors.Unavailable(message), error);
      case "SequelizeHostNotFoundError":
        throw wrap(new errors.NotFound(message), error);
      default:
        throw wrap(new errors.GeneralError(message), error);
    }
  }
  throw error;
};
const getOrder = (sort = {}) => Object.keys(sort).reduce(
  (order, name) => {
    let direction;
    if (Array.isArray(sort[name])) {
      direction = parseInt(sort[name][0], 10) === 1 ? "ASC" : "DESC";
      direction += parseInt(sort[name][1], 10) === 1 ? " NULLS FIRST" : " NULLS LAST";
    } else {
      direction = parseInt(sort[name], 10) === 1 ? "ASC" : "DESC";
    }
    order.push([name, direction]);
    return order;
  },
  []
);
const isPlainObject = (obj) => {
  return !!obj && obj.constructor === {}.constructor;
};
const isPresent = (obj) => {
  if (Array.isArray(obj)) {
    return obj.length > 0;
  }
  if (isPlainObject(obj)) {
    return Object.keys(obj).length > 0;
  }
  return !!obj;
};

const defaultOperatorMap = {
  $eq: sequelize.Op.eq,
  $ne: sequelize.Op.ne,
  $gte: sequelize.Op.gte,
  $gt: sequelize.Op.gt,
  $lte: sequelize.Op.lte,
  $lt: sequelize.Op.lt,
  $in: sequelize.Op.in,
  $nin: sequelize.Op.notIn,
  $like: sequelize.Op.like,
  $notLike: sequelize.Op.notLike,
  $iLike: sequelize.Op.iLike,
  $notILike: sequelize.Op.notILike,
  $or: sequelize.Op.or,
  $and: sequelize.Op.and
};
const defaultFilters = {
  $and: true
};
const catchHandler = (handler) => {
  return (sequelizeError) => {
    try {
      errorHandler(sequelizeError);
    } catch (feathersError) {
      handler(feathersError, sequelizeError);
    }
    throw new errors.GeneralError("`handleError` method must throw an error");
  };
};
class SequelizeAdapter extends adapterCommons.AdapterBase {
  constructor(options) {
    if (!options.Model) {
      throw new errors.GeneralError("You must provide a Sequelize Model");
    }
    if (options.operators && !Array.isArray(options.operators)) {
      throw new errors.GeneralError(
        "The 'operators' option must be an array. For migration from feathers.js v4 see: https://github.com/feathersjs-ecosystem/feathers-sequelize/tree/dove#migrate-to-feathers-v5-dove"
      );
    }
    const operatorMap = {
      ...defaultOperatorMap,
      ...options.operatorMap
    };
    const operators = Object.keys(operatorMap);
    if (options.operators) {
      options.operators.forEach((op) => {
        if (!operators.includes(op)) {
          operators.push(op);
        }
      });
    }
    const { primaryKeyAttributes } = options.Model;
    const id = typeof primaryKeyAttributes === "object" && primaryKeyAttributes[0] !== void 0 ? primaryKeyAttributes[0] : "id";
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
  get raw() {
    return this.options.raw !== false;
  }
  /**
   *
   * @deprecated Use `Op` from `sequelize` directly
   */
  get Op() {
    return sequelize.Op;
  }
  get Model() {
    if (!this.options.Model) {
      throw new errors.GeneralError(
        "The Model getter was called with no Model provided in options!"
      );
    }
    return this.options.Model;
  }
  getModel(_params) {
    if (!this.options.Model) {
      throw new errors.GeneralError(
        "getModel was called without a Model present in the constructor options and without overriding getModel! Perhaps you intended to override getModel in a child class?"
      );
    }
    return this.options.Model;
  }
  convertOperators(q) {
    if (Array.isArray(q)) {
      return q.map((subQuery) => this.convertOperators(subQuery));
    }
    if (!isPlainObject(q)) {
      return q;
    }
    const { operatorMap = {} } = this.options;
    const converted = Object.keys(q).reduce(
      (result, prop) => {
        const value = q[prop];
        const key = operatorMap[prop] ? operatorMap[prop] : prop;
        result[key] = this.convertOperators(value);
        return result;
      },
      {}
    );
    Object.getOwnPropertySymbols(q).forEach((symbol) => {
      converted[symbol] = q[symbol];
    });
    return converted;
  }
  filterQuery(params) {
    const options = this.getOptions(params);
    const { filters, query: _query } = adapterCommons.filterQuery(params.query || {}, options);
    const query = this.convertOperators({
      ..._query,
      ...commons._.omit(filters, "$select", "$skip", "$limit", "$sort")
    });
    if (filters.$select) {
      if (!filters.$select.includes(this.id)) {
        filters.$select.push(this.id);
      }
      filters.$select = filters.$select.map((select) => `${select}`);
    }
    return {
      filters,
      query,
      paginate: options.paginate
    };
  }
  // paramsToAdapter (id: NullableId, _params?: ServiceParams): FindOptions {
  paramsToAdapter(id, _params) {
    const params = _params || {};
    const { filters, query: where } = this.filterQuery(params);
    const defaults = {
      where,
      attributes: filters.$select,
      distinct: true,
      returning: true,
      raw: this.raw,
      ...params.sequelize
    };
    if (id === null) {
      return {
        order: getOrder(filters.$sort),
        limit: filters.$limit,
        offset: filters.$skip,
        ...defaults
      };
    }
    const sequelize$1 = {
      limit: 1,
      ...defaults
    };
    if (where[this.id] === id) {
      return sequelize$1;
    }
    if (this.id in where) {
      const { and } = sequelize.Op;
      where[and] = where[and] ? [...where[and], { [this.id]: id }] : { [this.id]: id };
    } else {
      where[this.id] = id;
    }
    return sequelize$1;
  }
  handleError(feathersError, _sequelizeError) {
    throw feathersError;
  }
  async _find(params = {}) {
    const Model = this.getModel(params);
    const { paginate } = this.filterQuery(params);
    const sequelizeOptions = this.paramsToAdapter(null, params);
    if (!paginate || !paginate.default) {
      const result2 = await Model.findAll(sequelizeOptions).catch(
        catchHandler(this.handleError)
      );
      return result2;
    }
    if (sequelizeOptions.limit === 0) {
      const total = await Model.count({
        ...sequelizeOptions,
        attributes: void 0
      }).catch(catchHandler(this.handleError));
      return {
        total,
        limit: sequelizeOptions.limit,
        skip: sequelizeOptions.offset || 0,
        data: []
      };
    }
    const result = await Model.findAndCountAll(sequelizeOptions).catch(
      catchHandler(this.handleError)
    );
    return {
      total: result.count,
      limit: sequelizeOptions.limit,
      skip: sequelizeOptions.offset || 0,
      data: result.rows
    };
  }
  async _get(id, params = {}) {
    const Model = this.getModel(params);
    const sequelizeOptions = this.paramsToAdapter(id, params);
    const result = await Model.findAll(sequelizeOptions).catch(
      catchHandler(this.handleError)
    );
    if (result.length === 0) {
      throw new errors.NotFound(`No record found for id '${id}'`);
    }
    return result[0];
  }
  async _create(data, params = {}) {
    const isArray = Array.isArray(data);
    const select = adapterCommons.select(params, this.id);
    if (isArray && !this.allowsMulti("create", params)) {
      throw new errors.MethodNotAllowed("Can not create multiple entries");
    }
    if (isArray && data.length === 0) {
      return [];
    }
    const Model = this.getModel(params);
    const sequelizeOptions = this.paramsToAdapter(null, params);
    if (isArray) {
      const instances = await Model.bulkCreate(
        data,
        sequelizeOptions
      ).catch(catchHandler(this.handleError));
      if (sequelizeOptions.returning === false) {
        return [];
      }
      if (sequelizeOptions.raw) {
        const result2 = instances.map((instance) => {
          if (isPresent(sequelizeOptions.attributes)) {
            return select(instance.toJSON());
          }
          return instance.toJSON();
        });
        return result2;
      }
      if (isPresent(sequelizeOptions.attributes)) {
        const result2 = instances.map((instance) => {
          const result3 = select(instance.toJSON());
          return Model.build(result3, { isNewRecord: false });
        });
        return result2;
      }
      return instances;
    }
    const result = await Model.create(
      data,
      sequelizeOptions
    ).catch(catchHandler(this.handleError));
    if (sequelizeOptions.raw) {
      return select(result.toJSON());
    }
    return result;
  }
  async _patch(id, data, params = {}) {
    if (id === null && !this.allowsMulti("patch", params)) {
      throw new errors.MethodNotAllowed("Can not patch multiple entries");
    }
    const Model = this.getModel(params);
    const sequelizeOptions = this.paramsToAdapter(id, params);
    const select = adapterCommons.select(params, this.id);
    const values = commons._.omit(data, this.id);
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
        return [];
      }
      const ids = current.map((item) => item[this.id]);
      let [, instances] = await Model.update(values, {
        ...sequelizeOptions,
        raw: false,
        where: { [this.id]: ids.length === 1 ? ids[0] : { [sequelize.Op.in]: ids } }
      }).catch(catchHandler(this.handleError));
      if (sequelizeOptions.returning === false) {
        return [];
      }
      if (!instances || typeof instances === "number") {
        instances = void 0;
      }
      const hasAttributes = isPresent(sequelizeOptions.attributes);
      if (instances) {
        if (isPresent(params.query?.$sort)) {
          const sortedInstances = [];
          const unsortedInstances = [];
          current.forEach((item) => {
            const id2 = item[this.id];
            const instance2 = instances.find(
              (instance3) => instance3[this.id] === id2
            );
            if (instance2) {
              sortedInstances.push(instance2);
            } else {
              unsortedInstances.push(item);
            }
          });
          instances = [...sortedInstances, ...unsortedInstances];
        }
        if (sequelizeOptions.raw) {
          const result2 = instances.map((instance2) => {
            if (hasAttributes) {
              return select(instance2.toJSON());
            }
            return instance2.toJSON();
          });
          return result2;
        }
        if (hasAttributes) {
          const result2 = instances.map((instance2) => {
            const result3 = select(instance2.toJSON());
            return Model.build(result3, { isNewRecord: false });
          });
          return result2;
        }
        return instances;
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
    });
    await instance.set(values).update(values, sequelizeOptions).catch(catchHandler(this.handleError));
    if (isPresent(sequelizeOptions.include)) {
      return this._get(id, {
        ...params,
        query: { $select: params.query?.$select }
      });
    }
    if (sequelizeOptions.raw) {
      const result = instance.toJSON();
      if (isPresent(sequelizeOptions.attributes)) {
        return select(result);
      }
      return result;
    }
    if (isPresent(sequelizeOptions.attributes)) {
      const result = select(instance.toJSON());
      return Model.build(result, { isNewRecord: false });
    }
    return instance;
  }
  async _update(id, data, params = {}) {
    const Model = this.getModel(params);
    const sequelizeOptions = this.paramsToAdapter(id, params);
    const select = adapterCommons.select(params, this.id);
    const instance = await this._get(id, {
      ...params,
      sequelize: { ...params.sequelize, raw: false }
    });
    const values = Object.values(Model.getAttributes()).reduce(
      (values2, attribute) => {
        const key = attribute.fieldName;
        if (key === this.id) {
          return values2;
        }
        values2[key] = key in data ? data[key] : null;
        return values2;
      },
      {}
    );
    await instance.set(values).update(values, sequelizeOptions).catch(catchHandler(this.handleError));
    if (isPresent(sequelizeOptions.include)) {
      return this._get(id, {
        ...params,
        query: { $select: params.query?.$select }
      });
    }
    if (sequelizeOptions.raw) {
      const result = instance.toJSON();
      if (isPresent(sequelizeOptions.attributes)) {
        return select(result);
      }
      return result;
    }
    if (isPresent(sequelizeOptions.attributes)) {
      const result = select(instance.toJSON());
      return Model.build(result, { isNewRecord: false });
    }
    return instance;
  }
  async _remove(id, params = {}) {
    if (id === null && !this.allowsMulti("remove", params)) {
      throw new errors.MethodNotAllowed("Can not remove multiple entries");
    }
    const Model = this.getModel(params);
    const sequelizeOptions = this.paramsToAdapter(id, params);
    if (id === null) {
      const $select = sequelizeOptions.returning === false ? [this.id] : params?.query?.$select;
      const current = await this._find({
        ...params,
        paginate: false,
        query: { ...params.query, $select }
      });
      if (!current.length) {
        return [];
      }
      const ids = current.map((item) => item[this.id]);
      await Model.destroy({
        ...params.sequelize,
        where: { [this.id]: ids.length === 1 ? ids[0] : { [sequelize.Op.in]: ids } }
      }).catch(catchHandler(this.handleError));
      if (sequelizeOptions.returning === false) {
        return [];
      }
      return current;
    }
    const result = await this._get(id, params);
    const instance = result instanceof Model ? result : Model.build(result, { isNewRecord: false });
    await instance.destroy(sequelizeOptions);
    return result;
  }
}

const serialize = (item) => {
  if (typeof item.toJSON === "function") {
    return item.toJSON();
  }
  return item;
};
const dehydrate = () => {
  return function(context) {
    switch (context.method) {
      case "find":
        if (context.result.data) {
          context.result.data = context.result.data.map(serialize);
        } else {
          context.result = context.result.map(serialize);
        }
        break;
      case "get":
      case "update":
        context.result = serialize(context.result);
        break;
      case "create":
      case "patch":
        if (Array.isArray(context.result)) {
          context.result = context.result.map(serialize);
        } else {
          context.result = serialize(context.result);
        }
        break;
    }
    return Promise.resolve(context);
  };
};

const factory = (Model, include) => {
  return (item) => {
    const shouldBuild = !(item instanceof Model);
    if (shouldBuild) {
      return Model.build(item, { isNewRecord: false, include });
    }
    return item;
  };
};
const hydrate = (options) => {
  options = options || {};
  return (context) => {
    if (context.type !== "after") {
      throw new Error(
        'feathers-sequelize hydrate() - should only be used as an "after" hook'
      );
    }
    const makeInstance = factory(context.service.Model, options.include);
    switch (context.method) {
      case "find":
        if (context.result.data) {
          context.result.data = context.result.data.map(makeInstance);
        } else {
          context.result = context.result.map(makeInstance);
        }
        break;
      case "get":
      case "update":
        context.result = makeInstance(context.result);
        break;
      case "create":
      case "patch":
        if (Array.isArray(context.result)) {
          context.result = context.result.map(makeInstance);
        } else {
          context.result = makeInstance(context.result);
        }
        break;
    }
    return Promise.resolve(context);
  };
};

class SequelizeService extends SequelizeAdapter {
  async find(params) {
    return this._find(params);
  }
  async get(id, params) {
    return this._get(id, params);
  }
  async create(data, params) {
    return this._create(data, params);
  }
  async update(id, data, params) {
    return this._update(id, data, params);
  }
  async patch(id, data, params) {
    return this._patch(id, data, params);
  }
  async remove(id, params) {
    return this._remove(id, params);
  }
}

exports.ERROR = ERROR;
exports.SequelizeAdapter = SequelizeAdapter;
exports.SequelizeService = SequelizeService;
exports.dehydrate = dehydrate;
exports.errorHandler = errorHandler;
exports.hydrate = hydrate;
