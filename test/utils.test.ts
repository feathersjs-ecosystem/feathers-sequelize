import { expect } from 'chai';

import * as errors from '@feathersjs/errors';
import Sequelize from 'sequelize';

import * as utils from '../src/utils';

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
      // @ts-ignore
      const e = new Sequelize.ValidationError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('preserves a validation error message', () => {
      // @ts-ignore
      const e = new Sequelize.ValidationError('Invalid Email');
      try {
        utils.errorHandler(e);
      } catch (error: any) {
        expect(error.message).to.equal('Invalid Email');
      }
    });

    it('preserves a validation errors', () => {
      const emailError: any = {
        message: 'email cannot be null',
        type: 'notNull Violation',
        path: 'email',
        value: null
      };

      // @ts-ignore
      const e = new Sequelize.ValidationError('Invalid Email', [emailError]);
      try {
        utils.errorHandler(e);
      } catch (error: any) {
        expect(error.errors).to.deep.equal([emailError]);
      }
    });

    it('wraps a UniqueConstraintError as a BadRequest', () => {
      // @ts-ignore
      const e = new Sequelize.UniqueConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a ExclusionConstraintError as a BadRequest', () => {
      // @ts-ignore
      const e = new Sequelize.ExclusionConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a ForeignKeyConstraintError as a BadRequest', () => {
      // @ts-ignore
      const e = new Sequelize.ForeignKeyConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a InvalidConnectionError as a BadRequest', () => {
      // @ts-ignore
      const e = new Sequelize.InvalidConnectionError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a TimeoutError as a Timeout', () => {
      // NOTE (EK): We need to pass something to a time error otherwise
      // Sequelize blows up.
      // @ts-ignore
      const e = new Sequelize.TimeoutError('');
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Timeout);
    });

    it('wraps a ConnectionTimedOutError as a Timeout', () => {
      // @ts-ignore
      const e = new Sequelize.ConnectionTimedOutError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Timeout);
    });

    it('wraps a ConnectionRefusedError as a Forbidden', () => {
      // @ts-ignore
      const e = new Sequelize.ConnectionRefusedError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Forbidden);
    });

    it('wraps a AccessDeniedError as a Forbidden', () => {
      // @ts-ignore
      const e = new Sequelize.AccessDeniedError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Forbidden);
    });

    it('wraps a HostNotReachableError as a Unavailable', () => {
      // @ts-ignore
      const e = new Sequelize.HostNotReachableError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Unavailable);
    });

    it('wraps a HostNotFoundError as a NotFound', () => {
      // @ts-ignore
      const e = new Sequelize.HostNotFoundError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.NotFound);
    });

    it('wraps a DatabaseError as a GeneralError', () => {
      // @ts-ignore
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

  describe('isPlainObject', () => {
    it('returns true for plain objects', () => {
      expect(utils.isPlainObject({})).to.equal(true);
      expect(utils.isPlainObject({ a: 1 })).to.equal(true);
    });

    it('returns false for non-plain objects', () => {
      expect(utils.isPlainObject([])).to.equal(false);
      expect(utils.isPlainObject(new Date())).to.equal(false);
      expect(utils.isPlainObject(null)).to.equal(false);
      expect(utils.isPlainObject(undefined)).to.equal(false);
      expect(utils.isPlainObject('')).to.equal(false);
      expect(utils.isPlainObject(1)).to.equal(false);
      expect(utils.isPlainObject(true)).to.equal(false);
    });
  });

  describe('isPresent', () => {
    it('returns true for present objects', () => {
      expect(utils.isPresent({ a: 1 })).to.equal(true);
      expect(utils.isPresent([1])).to.equal(true);
      expect(utils.isPresent('a')).to.equal(true);
      expect(utils.isPresent(1)).to.equal(true);
      expect(utils.isPresent(true)).to.equal(true);
    });

    it('returns false for non-present objects', () => {
      expect(utils.isPresent({})).to.equal(false);
      expect(utils.isPresent([])).to.equal(false);
      expect(utils.isPresent('')).to.equal(false);
      expect(utils.isPresent(null)).to.equal(false);
      expect(utils.isPresent(undefined)).to.equal(false);
    });
  });
});
