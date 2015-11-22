import assert from 'assert';
import plugin from '../src';

describe('feathers-sequelize', () => {
  it('basic functionality', done => {
    assert.equal(typeof plugin, 'function', 'It worked');
    done();
  });
});
