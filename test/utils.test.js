const { expect } = require('chai');

const errors = require('@feathersjs/errors');
const Sequelize = require('sequelize');

const utils = require('../lib/utils');

describe('Feathers Sequelize Utils', () => {
  describe('errorHandler', () => {
    it('throws a feathers error', () => {
      const e = new errors.GeneralError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.GeneralError);
    });

    it('throws a regular error', () => {
      const e = new Error('Regular Error');
      expect(utils.errorHandler.bind(null, e)).to.throw(e);
    });

    it('wraps a ValidationError as a BadRequest', () => {
      const e = new Sequelize.ValidationError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('preserves a validation error message', () => {
      const e = new Sequelize.ValidationError('Invalid Email');
      try {
        utils.errorHandler(e);
      } catch (error) {
        expect(error.message).to.equal('Invalid Email');
      }
    });

    it('preserves a validation errors', () => {
      const emailError = {
        message: 'email cannot be null',
        type: 'notNull Violation',
        path: 'email',
        value: null
      };

      const e = new Sequelize.ValidationError('Invalid Email', [emailError]);
      try {
        utils.errorHandler(e);
      } catch (error) {
        expect(error.errors).to.deep.equal([emailError]);
      }
    });

    it('wraps a UniqueConstraintError as a BadRequest', () => {
      const e = new Sequelize.UniqueConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a ExclusionConstraintError as a BadRequest', () => {
      const e = new Sequelize.ExclusionConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a ForeignKeyConstraintError as a BadRequest', () => {
      const e = new Sequelize.ForeignKeyConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a InvalidConnectionError as a BadRequest', () => {
      const e = new Sequelize.InvalidConnectionError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a TimeoutError as a Timeout', () => {
      // NOTE (EK): We need to pass something to a time error otherwise
      // Sequelize blows up.
      const e = new Sequelize.TimeoutError('');
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Timeout);
    });

    it('wraps a ConnectionTimedOutError as a Timeout', () => {
      const e = new Sequelize.ConnectionTimedOutError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Timeout);
    });

    it('wraps a ConnectionRefusedError as a Forbidden', () => {
      const e = new Sequelize.ConnectionRefusedError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Forbidden);
    });

    it('wraps a AccessDeniedError as a Forbidden', () => {
      const e = new Sequelize.AccessDeniedError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Forbidden);
    });

    it('wraps a HostNotReachableError as a Unavailable', () => {
      const e = new Sequelize.HostNotReachableError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Unavailable);
    });

    it('wraps a HostNotFoundError as a NotFound', () => {
      const e = new Sequelize.HostNotFoundError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.NotFound);
    });

    it('wraps a DatabaseError as a GeneralError', () => {
      const e = new Sequelize.DatabaseError('');
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.GeneralError);
    });
  });

  describe('getOrder', () => {
    it('returns empty array when nothing is passed in', () => {
      const order = utils.getOrder();

      expect(order).to.deep.equal([]);
    });

    it('returns order properly converted', () => {
      const order = utils.getOrder({ name: 1, age: -1 });

      expect(order).to.deep.equal([['name', 'ASC'], ['age', 'DESC']]);
    });

    it('returns order properly converted with the position of the nulls', () => {
      const order = utils.getOrder({
        name: [1, 1],
        lastName: [1, -1],
        age: [-1, 1],
        phone: [-1, -1]
      });

      expect(order).to.deep.equal([
        ['name', 'ASC NULLS FIRST'],
        ['lastName', 'ASC NULLS LAST'],
        ['age', 'DESC NULLS FIRST'],
        ['phone', 'DESC NULLS LAST']
      ]);
    });
  });
});
