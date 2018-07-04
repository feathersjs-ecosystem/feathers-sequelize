const { expect } = require('chai');
const Sequelize = require('sequelize');

const sequelize = require('../connection');
const hydrate = require('../../lib/hooks/hydrate');

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

  it('hydrates results for find()', () => {
    return callHook(BlogPost, 'find', [{title: 'David'}]).then(hook =>
      expect(hook.result[0] instanceof BlogPost).to.be.ok
    );
  });

  it('hydrates results for paginated find()', () => {
    return callHook(BlogPost, 'find', {
      data: [{title: 'David'}]
    }).then(hook =>
      expect(hook.result.data[0] instanceof BlogPost).to.be.ok
    );
  });

  it('hydrates results for get()', () => {
    return callHook(BlogPost, 'get', {title: 'David'}).then(hook =>
      expect(hook.result instanceof BlogPost).to.be.ok
    );
  });

  ['create', 'update', 'patch'].forEach(method => {
    it(`hydrates results for single ${method}()`, () => {
      return callHook(BlogPost, method, {title: 'David'}).then(hook =>
        expect(hook.result instanceof BlogPost).to.be.ok
      );
    });
  });

  ['create', 'patch'].forEach(method => {
    it(`hydrates results for bulk ${method}()`, () => {
      return callHook(BlogPost, method, [{title: 'David'}]).then(hook =>
        expect(hook.result[0] instanceof BlogPost).to.be.ok
      );
    });
  });

  it('hydrates included (associated) models', () => {
    return callHook(BlogPost, 'get', {
      title: 'David',
      comments: [{ text: 'Comment text' }]
    }, {
      include: [Comment]
    }).then(hook =>
      expect(hook.result.comments[0] instanceof Comment).to.be.ok
    );
  });

  it('does not hydrate if data is a Model instance', () => {
    const instance = BlogPost.build({ title: 'David' });
    return callHook(BlogPost, 'get', instance).then(hook =>
      expect(hook.result).to.equal(instance)
    );
  });
});
