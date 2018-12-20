const { expect } = require('chai');
const Sequelize = require('sequelize');

const dehydrate = require('../lib/hooks/dehydrate');
const sequelize = require('./connection')();

const BlogPost = sequelize.define('blogpost', {
  title: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  freezeTableName: true
});
const Comment = sequelize.define('comment', {
  text: {
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  freezeTableName: true
});
BlogPost.hasMany(Comment);
Comment.belongsTo(BlogPost);

const callHook = (Model, method, result, options) => {
  if (result.data) {
    result.data = result.data.map(item => Model.build(item, options));
  } else if (Array.isArray(result)) {
    result = result.map(item => Model.build(item, options));
  } else {
    result = Model.build(result, options);
  }
  return dehydrate().call({ Model }, {
    type: 'after',
    method,
    result
  });
};

describe('Feathers Sequelize Dehydrate Hook', () => {
  before(() =>
    sequelize.sync()
  );

  it('serializes results for find()', async () => {
    const hook = await callHook(BlogPost, 'find', [{ title: 'David' }]);

    expect(Object.getPrototypeOf(hook.result[0])).to.equal(Object.prototype);
  });

  it('serializes results for paginated find()', async () => {
    const hook = await callHook(BlogPost, 'find', {
      data: [{ title: 'David' }]
    });

    expect(Object.getPrototypeOf(hook.result.data[0])).to.equal(Object.prototype);
  });

  it('serializes results for get()', async () => {
    const hook = await callHook(BlogPost, 'get', { title: 'David' });

    expect(Object.getPrototypeOf(hook.result)).to.equal(Object.prototype);
  });

  ['create', 'update', 'patch'].forEach(method => {
    it(`serializes results for single ${method}()`, async () => {
      const hook = await callHook(BlogPost, method, { title: 'David' });

      expect(Object.getPrototypeOf(hook.result)).to.equal(Object.prototype);
    });
  });

  ['create', 'patch'].forEach(method => {
    it(`serializes results for bulk ${method}()`, async () => {
      const hook = await callHook(BlogPost, method, [{ title: 'David' }]);

      expect(Object.getPrototypeOf(hook.result[0])).to.equal(Object.prototype);
    });
  });

  it('serializes included (associated) models', async () => {
    const hook = await callHook(BlogPost, 'get', {
      title: 'David',
      comments: [{ text: 'Comment text' }]
    }, {
      include: [Comment]
    });

    expect(Object.getPrototypeOf(hook.result.comments[0])).to.equal(Object.prototype);
  });

  it('does not serialize if data is not a Model instance (with a toJSON method)', async () => {
    const result = { title: 'David' };

    const hook = await dehydrate().call({ Model: BlogPost }, {
      type: 'after',
      method: 'get',
      result
    });

    expect(hook.result).to.equal(result);
  });
});
