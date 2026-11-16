import type { HookContext } from '@feathersjs/feathers'
import { expect } from 'chai'
import Sequelize from 'sequelize'

import type { SequelizeAdapterParams } from '../src'
import { SequelizeService } from '../src'
import { hydrate } from '../src/hooks/hydrate'
import makeConnection from './connection'
const sequelize = makeConnection(process.env.DB)

type MethodName = 'find' | 'get' | 'create' | 'update' | 'patch' | 'remove'

const BlogPost = sequelize.define(
  'blogpost',
  {
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
  },
)
const Comment = sequelize.define(
  'comment',
  {
    text: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
  },
)
BlogPost.hasMany(Comment)
Comment.belongsTo(BlogPost)

const callHook = (
  Model: any,
  method: MethodName,
  result: any,
  options?: any,
) => {
  return hydrate(options)({
    service: new SequelizeService({ Model }),
    params: {},
    type: 'after',
    method,
    result,
  } as HookContext)
}

describe('Feathers Sequelize Hydrate Hook', () => {
  before(() => sequelize.sync())

  it('throws if used as a "before" hook', () => {
    const hook = hydrate().bind(null, { type: 'before' } as HookContext)
    expect(hook).to.throw(Error)
  })

  it('hydrates results for find()', async () => {
    const hook = await callHook(BlogPost, 'find', [{ title: 'David' }])

    expect(hook.result[0] instanceof BlogPost)
  })

  it('hydrates results for paginated find()', async () => {
    const hook = await callHook(BlogPost, 'find', {
      data: [{ title: 'David' }],
    })

    expect(hook.result.data[0] instanceof BlogPost)
  })

  it('hydrates results for get()', async () => {
    const hook = await callHook(BlogPost, 'get', { title: 'David' })

    expect(hook.result instanceof BlogPost)
  })
  ;(['create', 'update', 'patch'] as MethodName[]).forEach((method) => {
    it(`hydrates results for single ${method}()`, async () => {
      const hook = await callHook(BlogPost, method, { title: 'David' })

      expect(hook.result instanceof BlogPost)
    })
  })
  ;(['create', 'patch'] as MethodName[]).forEach((method) => {
    it(`hydrates results for bulk ${method}()`, async () => {
      const hook = await callHook(BlogPost, method, [{ title: 'David' }])

      expect(hook.result[0] instanceof BlogPost)
    })
  })

  it('hydrates included (associated) models', async () => {
    const hook = await callHook(
      BlogPost,
      'get',
      {
        title: 'David',
        comments: [{ text: 'Comment text' }],
      },
      {
        include: [Comment],
      },
    )

    expect(hook.result.comments[0] instanceof Comment)
  })

  it('does not hydrate if data is a Model instance', async () => {
    const instance = BlogPost.build({ title: 'David' })
    const hook = await callHook(BlogPost, 'get', instance)

    expect(hook.result).to.equal(instance)
  })

  describe('Dynamic model selection', () => {
    class RoutedService extends SequelizeService {
      lastParams?: SequelizeAdapterParams

      getModel(params: SequelizeAdapterParams = {}) {
        this.lastParams = params
        return params.sequelize.model
      }

      get Model(): never {
        throw new Error('Hydration must use getModel(params)')
      }
    }
    const service = new RoutedService({ Model: BlogPost })
    const callRoutedHook = async (
      Model: any,
      method: MethodName,
      result: any,
      options?: any,
    ) => {
      const params = { sequelize: { model: Model } }
      const context = await hydrate(options)({
        service,
        params,
        type: 'after',
        method,
        result,
      } as HookContext)

      expect(service.lastParams).to.equal(params)
      return context
    }

    it('selects the model from the params of each call', async () => {
      for (const [Model, result] of [
        [BlogPost, { title: 'David' }],
        [Comment, { text: 'Comment text' }],
      ] as const) {
        const context = await callRoutedHook(Model, 'get', result)

        expect(context.result).to.be.an.instanceOf(Model)
        expect(context.result.toJSON()).to.deep.equal(result)
      }
    })

    for (const method of ['find', 'create', 'patch'] as const) {
      it(`uses the selected model for bulk ${method}()`, async () => {
        const context = await callRoutedHook(Comment, method, [
          { text: 'First' },
          { text: 'Second' },
        ])

        expect(context.result).to.have.lengthOf(2)
        for (const item of context.result) {
          expect(item).to.be.an.instanceOf(Comment)
        }
      })
    }

    it('uses the selected model for paginated find()', async () => {
      const context = await callRoutedHook(Comment, 'find', {
        total: 1,
        limit: 10,
        skip: 0,
        data: [{ text: 'Comment text' }],
      })

      expect(context.result.data[0]).to.be.an.instanceOf(Comment)
      expect(context.result).to.include({ total: 1, limit: 10, skip: 0 })
    })

    it('hydrates associations on the selected model', async () => {
      const context = await callRoutedHook(
        BlogPost,
        'get',
        { title: 'David', comments: [{ text: 'Comment text' }] },
        { include: [Comment] },
      )

      expect(context.result).to.be.an.instanceOf(BlogPost)
      expect(context.result.comments[0]).to.be.an.instanceOf(Comment)
    })

    it('preserves existing instances of the selected model', async () => {
      const instance = Comment.build(
        { text: 'Comment text' },
        { isNewRecord: false, raw: true },
      )
      const context = await callRoutedHook(Comment, 'get', instance)

      expect(context.result).to.equal(instance)
    })
  })

  describe('Custom setters', () => {
    let setterCalls = 0
    const StoredValue = sequelize.define(
      'hydrate-stored-values',
      {
        value: {
          type: Sequelize.INTEGER,
          set(value: any) {
            setterCalls++
            this.setDataValue('value', value + 1)
          },
          get() {
            return this.getDataValue('value') * 2
          },
        },
      },
      { timestamps: false, freezeTableName: true },
    )
    StoredValue.hasMany(StoredValue, { as: 'children', foreignKey: 'parentId' })

    beforeEach(() => {
      setterCalls = 0
    })

    const expectStoredValue = (item: any, value: number) => {
      expect(item).to.be.an.instanceOf(StoredValue)
      expect(item.isNewRecord).to.equal(false)
      expect(item.getDataValue('value')).to.equal(value)
      expect(item.value).to.equal(value * 2)
      expect(item.changed()).to.equal(false)
      expect(setterCalls).to.equal(0)
    }

    for (const method of ['get', 'create', 'update', 'patch'] as const) {
      it(`preserves stored values for single ${method}()`, async () => {
        const input = Object.freeze({ id: 1, value: 7 })
        const hook = await callHook(StoredValue, method, input)

        expectStoredValue(hook.result, 7)
        expect(input).to.deep.equal({ id: 1, value: 7 })
      })
    }

    for (const method of ['find', 'create', 'patch'] as const) {
      it(`preserves stored values for bulk ${method}()`, async () => {
        const hook = await callHook(StoredValue, method, [
          { id: 1, value: 7 },
          { id: 2, value: 11 },
        ])

        expect(hook.result).to.have.lengthOf(2)
        expectStoredValue(hook.result[0], 7)
        expectStoredValue(hook.result[1], 11)
      })
    }

    it('preserves stored values and metadata for paginated find()', async () => {
      const hook = await callHook(StoredValue, 'find', {
        total: 1,
        limit: 10,
        skip: 0,
        data: [{ id: 1, value: 7 }],
      })

      expectStoredValue(hook.result.data[0], 7)
      expect(hook.result).to.include({ total: 1, limit: 10, skip: 0 })
    })

    it('preserves stored values in included models', async () => {
      const hook = await callHook(
        StoredValue,
        'get',
        {
          id: 1,
          value: 7,
          children: [{ id: 2, parentId: 1, value: 11 }],
        },
        { include: [{ model: StoredValue, as: 'children' }] },
      )

      expectStoredValue(hook.result, 7)
      expectStoredValue(hook.result.children[0], 11)
    })

    it('preserves an existing model instance', async () => {
      const instance = StoredValue.build(
        { id: 1, value: 7 },
        { isNewRecord: false, raw: true },
      )
      const hook = await callHook(StoredValue, 'get', instance)

      expect(hook.result).to.equal(instance)
      expectStoredValue(hook.result, 7)
    })
  })
})
