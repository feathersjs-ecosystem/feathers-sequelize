import Sequelize from 'sequelize';

export { Sequelize };

export class Service {
  constructor(... args) {
    this.sequelize = new Sequelize(... args);
  }

  find(params, callback) {

  }

  get(id, params, callback) {
    this.Model.findById(id).then()
  }

  create(data, params, callback) {

  }

  update(id, data, params, callback) {

  }

  patch(id, data, params, callback) {

  }

  remove(id, params, callback) {

  }
}

export default function(... args) {
  return new Service(... args);
}
