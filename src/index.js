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

// Create the service.
export const Service = Proto.extend({
	init(Model) {
    this.Model = Model;
	},

	find(params, callback) {
		let where = getWhere(params.query);
		let filters = filter(where);
		let order = getOrder(filters.$sort || {});

    this.Model.findAll({
			where, order,
			limit: filters.$limit,
			offset: filters.$skip,
			attributes: filters.$select || null
		}).then(items => callback(null, items), callback);
	},

	get(id, params, callback) {
		if(typeof id === 'function') {
			return id(new errors.BadRequest('An id needs to be provided'));
		}

		this.Model.findById(id).then(instance => {
			if(!instance) {
				throw new errors.NotFound(`No record found for id '${id}'`);
			}

			return instance;
		}).then(instance => callback(null, instance), callback);
	},

	create(data, params, callback) {
		let promise = Array.isArray(data) ?
			this.Model.bulkCreate(data) : this.Model.create(data);

		promise.then(instance => callback(null, instance), callback);
	},

	patch(id, data, params, callback) {
		this.Model.findById(id).then(instance => {
			if(!instance) {
				throw new errors.NotFound(`No record found for id '${id}'`);
			}
			return instance.update(data);
		}).then(data => callback(null, data), callback);
	},

	update(id, data, params, callback) {
		this.Model.findById(id).then(instance => {
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
		}).then(data => callback(null, data), callback);
	},

	remove(id, params, callback) {
		this.Model.findById(id).then(instance => {
			return instance.destroy().then(() => instance);
		}).then(data => callback(null, data), callback);
	}
});

export default module.exports = function() {
  return Proto.create.apply(Service, arguments);
};
