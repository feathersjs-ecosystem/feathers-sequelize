import { expect } from 'chai';
import errors from 'feathers-errors';
import * as utils from '../src/utils';
import Sequelize from 'sequelize';

describe.only('Feathers Sequelize Utils', () => {
  describe('errorHandler', () => {
    it('throws a feathers error', () => {
      let e = new errors.GeneralError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.GeneralError);
    });

    it('throws a regular error', () => {
      let e = new Error('Regular Error');
      expect(utils.errorHandler.bind(null, e)).to.throw(e);
    });

    it('wraps a ValidationError as a BadRequest', () => {
      let e = new Sequelize.ValidationError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('preserves a validation error message', () => {
      let e = new Sequelize.ValidationError('Invalid Email');
      try {
        utils.errorHandler(e);
      }
      catch(error) {
        expect(error.message).to.equal('Invalid Email');
      }
    });

    it('preserves a validation errors', () => {
      let emailError = {
        message: 'email cannot be null',
        type: 'notNull Violation',
        path: 'email',
        value: null
      };

      let e = new Sequelize.ValidationError('Invalid Email', [emailError]);
      try {
        utils.errorHandler(e);
      }
      catch(error) {
        expect(error.errors).to.deep.equal([emailError]);
      }
    });

    it('wraps a UniqueConstraintError as a BadRequest', () => {
      let e = new Sequelize.UniqueConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a ExclusionConstraintError as a BadRequest', () => {
      let e = new Sequelize.ExclusionConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a ForeignKeyConstraintError as a BadRequest', () => {
      let e = new Sequelize.ForeignKeyConstraintError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a InvalidConnectionError as a BadRequest', () => {
      let e = new Sequelize.InvalidConnectionError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.BadRequest);
    });

    it('wraps a TimeoutError as a Timeout', () => {
      // NOTE (EK): We need to pass something to a time error otherwise
      // Sequelize blows up.
      let e = new Sequelize.TimeoutError('');
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Timeout);
    });

    it('wraps a ConnectionTimedOutError as a Timeout', () => {
      let e = new Sequelize.ConnectionTimedOutError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Timeout);
    });

    it('wraps a ConnectionRefusedError as a Forbidden', () => {
      let e = new Sequelize.ConnectionRefusedError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Forbidden);
    });

    it('wraps a AccessDeniedError as a Forbidden', () => {
      let e = new Sequelize.AccessDeniedError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Forbidden);
    });

    it('wraps a HostNotReachableError as a Unavailable', () => {
      let e = new Sequelize.HostNotReachableError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.Unavailable);
    });

    it('wraps a HostNotFoundError as a NotFound', () => {
      let e = new Sequelize.HostNotFoundError();
      expect(utils.errorHandler.bind(null, e)).to.throw(errors.NotFound);
    });
  });
});