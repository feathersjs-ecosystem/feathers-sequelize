if(!global._babelPolyfill) { require('babel-polyfill'); }

import Proto from 'uberproto';
import filter from 'feathers-query-filters';
import { types as errors } from 'feathers-errors';

function getOrder(sort) {
	let order = [];

	Object.keys(sort).forEach(name =>
		order.push([ name, sort[name] === 1 ? 'ASC' : 'DESC' ]));

	return order;
}

function getWhere(query) {
	let where = Object.assign({}, query);

	Object.keys(where).forEach(prop => {
		let value = where[prop];
		if(value.$nin) {
			value = Object.assign({}, value);

			value.$notIn = value.$nin;
			delete value.$nin;

			where[prop] = value;
		}
	});

	return where;
}

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
		let where = getWhere(params.query);
		let filters = filter(where);
		let order = getOrder(filters.$sort || {});
		let query = {
			where, order,
			limit: filters.$limit,
			offset: filters.$skip,
			attributes: filters.$select || null
		};

		if(this.paginate.default) {
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
			});
		}

		return this.Model.findAll(query);
	}

	get(id) {
		return this.Model.findById(id).then(instance => {
			if(!instance) {
				throw new errors.NotFound(`No record found for id '${id}'`);
			}

			return instance;
		});
	}

	create(data) {
		return Array.isArray(data) ?
			this.Model.bulkCreate(data) : this.Model.create(data);
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
		});
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
		});
	}

	remove(id, params) {
		const promise = id === null ? this.find(params) : this.get(id);

		return promise.then(data => {
			const where = Object.assign({}, params.query);

			if(id !== null) {
				where.id = id;
			}

			return this.Model.destroy({ where }).then(() => data);
		});
	}
}

export default function init(Model) {
  return new Service(Model);
}

init.Service = Service;
