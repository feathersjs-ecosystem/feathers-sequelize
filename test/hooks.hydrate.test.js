const { expect } = require('chai');
const Sequelize = require('sequelize');

const hydrate = require('../lib/hooks/hydrate');
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
  return hydrate(options).call({ Model }, {
    type: 'after',
    method,
    result
  });
};

describe('Feathers Sequelize Hydrate Hook', () => {
  before(() =>
    sequelize.sync()
  );

  it('throws if used as a "before" hook', () => {
    const hook = hydrate().bind(null, { type: 'before' });
    expect(hook).to.throw(Error);
  });

  it('hydrates results for find()', async () => {
    const hook = await callHook(BlogPost, 'find', [{ title: 'David' }]);

    expect(hook.result[0] instanceof BlogPost);
  });

  it('hydrates results for paginated find()', async () => {
    const hook = await callHook(BlogPost, 'find', {
      data: [{ title: 'David' }]
    });

    expect(hook.result.data[0] instanceof BlogPost);
  });

  it('hydrates results for get()', async () => {
    const hook = await callHook(BlogPost, 'get', { title: 'David' });

    expect(hook.result instanceof BlogPost);
  });

  ['create', 'update', 'patch'].forEach(method => {
    it(`hydrates results for single ${method}()`, async () => {
      const hook = await callHook(BlogPost, method, { title: 'David' });

      expect(hook.result instanceof BlogPost);
    });
  });

  ['create', 'patch'].forEach(method => {
    it(`hydrates results for bulk ${method}()`, async () => {
      const hook = await callHook(BlogPost, method, [{ title: 'David' }]);

      expect(hook.result[0] instanceof BlogPost);
    });
  });

  it('hydrates included (associated) models', async () => {
    const hook = await callHook(BlogPost, 'get', {
      title: 'David',
      comments: [{ text: 'Comment text' }]
    }, {
      include: [Comment]
    });

    expect(hook.result.comments[0] instanceof Comment);
  });

  it('does not hydrate if data is a Model instance', async () => {
    const instance = BlogPost.build({ title: 'David' });
    const hook = await callHook(BlogPost, 'get', instance);

    expect(hook.result).to.equal(instance);
  });
});
