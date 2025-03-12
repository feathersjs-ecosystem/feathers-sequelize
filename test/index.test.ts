import pg from 'pg'
import assert from 'node:assert'
import { expect } from 'chai'

import Sequelize, { Op } from 'sequelize'
import { errors } from '@feathersjs/errors'
import type { Paginated } from '@feathersjs/feathers'
import { feathers } from '@feathersjs/feathers'
import adaptertests from '@feathersjs/adapter-tests'

import type { SequelizeAdapterOptions } from '../src'
import { SequelizeService, hydrate, dehydrate, ERROR } from '../src'
import makeConnection from './connection'
const testSuite = adaptertests([
  '.options',
  '.events',
  '._create',
  '._find',
  '._get',
  '._patch',
  '._remove',
  '._update',
  'params.adapter + paginate',
  'params.adapter + multi',
  '.get',
  '.get + $select',
  '.get + id + query',
  // '.get + NotFound', // add '.get + NotFound (integer)' once https://github.com/feathersjs/feathers/pull/3486 is merged and published
  '.find',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  // add '.remove + NotFound (integer)' once https://github.com/feathersjs/feathers/pull/3486 is merged and published
  '.remove + multi',
  '.remove + multi no pagination',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + query + NotFound',
  // '.update + NotFound', // add '.update + NotFound (integer)' once https://github.com/feathersjs/feathers/pull/3486 is merged and published
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch multiple no pagination',
  '.patch multi query same',
  '.patch multi query changed',
  '.patch + query + NotFound',
  // '.patch + NotFound', // add '.patch + NotFound (integer)' once https://github.com/feathersjs/feathers/pull/3486 is merged and published
  '.create',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + query',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params',
  '.remove + id + query id',
  '.update + id + query id',
  '.patch + id + query id',
  '.get + id + query id',
])

// The base tests require the use of Sequelize.BIGINT to avoid 'out of range errors'
// Unfortunately BIGINT's are serialized as Strings:
// https://github.com/sequelize/sequelize/issues/1774
// eslint-disable-next-line import-x/no-named-as-default-member
pg.defaults.parseInt8 = true

const sequelize = makeConnection(process.env.DB)

const Model = sequelize.define(
  'people',
  {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    age: {
      type: Sequelize.INTEGER,
    },
    created: {
      type: Sequelize.BOOLEAN,
    },
    time: {
      type: Sequelize.BIGINT,
    },
    status: {
      type: Sequelize.STRING,
      defaultValue: 'pending',
    },
  },
  {
    freezeTableName: true,
  },
)
const Order = sequelize.define(
  'orders',
  {
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
  },
)
const CustomId = sequelize.define(
  'people-customid',
  {
    customid: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    age: {
      type: Sequelize.INTEGER,
    },
    created: {
      type: Sequelize.BOOLEAN,
    },
    time: {
      type: Sequelize.BIGINT,
    },
  },
  {
    freezeTableName: true,
  },
)
const CustomGetterSetter = sequelize.define(
  'custom-getter-setter',
  {
    addsOneOnSet: {
      type: Sequelize.INTEGER,
      set(val: any) {
        this.setDataValue('addsOneOnSet', val + 1)
      },
    },
    addsOneOnGet: {
      type: Sequelize.INTEGER,
      get() {
        return this.getDataValue('addsOneOnGet') + 1
      },
    },
  },
  {
    freezeTableName: true,
  },
)
Model.hasMany(Order)
Order.belongsTo(Model)

describe('Feathers Sequelize Service', () => {
  before(async () => {
    await Model.sync({ force: true })
    await CustomId.sync({ force: true })
    await CustomGetterSetter.sync({ force: true })
    await Order.sync({ force: true })
  })

  describe('Initialization', () => {
    it('throws an error when missing a Model', () => {
      // @ts-expect-error Model is missing
      expect(() => new SequelizeService({ name: 'Test' })).to.throw(
        'You must provide a Sequelize Model',
      )
    })

    it('throws an error if options.operators is not an array', () => {
      expect(
        () =>
          new SequelizeService({
            Model,
            operators: {
              // @ts-expect-error operators is not an array
              $like: Op.like,
            },
          }),
      ).to.throw(/The 'operators' option must be an array./)

      expect(
        () =>
          new SequelizeService({
            Model,
            operators: [],
          }),
      ).to.not.throw()
    })

    it('re-exports hooks', () => {
      assert.ok(hydrate)
      assert.ok(dehydrate)
    })
  })

  describe('Common Tests', () => {
    const app = feathers<{
      people: SequelizeService
      'people-customid': SequelizeService
    }>()
      .use(
        'people',
        new SequelizeService({
          Model,
          events: ['testing'],
        }),
      )
      .use(
        'people-customid',
        new SequelizeService({
          Model: CustomId,
          events: ['testing'],
        }),
      )

    it('has .Model', () => {
      assert.ok(app.service('people').Model)
    })

    testSuite(app, errors, 'people', 'id')
    testSuite(app, errors, 'people-customid', 'customid')

    describe('remove this when https://github.com/feathersjs/feathers/pull/3486 is merged and published', () => {
      it('.get + NotFound (integer)', async () => {
        try {
          await app.service('people').get(123456789)
          throw new Error('Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.name,
            'NotFound',
            'Error is a NotFound Feathers error',
          )
        }
      })

      it('.get + NotFound (integer)', async () => {
        try {
          await app.service('people-customid').get(123456789)
          throw new Error('Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.name,
            'NotFound',
            'Error is a NotFound Feathers error',
          )
        }
      })

      it('.remove + NotFound (integer)', async () => {
        try {
          await app.service('people').remove(123456789)
          throw new Error('Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.name,
            'NotFound',
            'Error is a NotFound Feathers error',
          )
        }
      })

      it('.remove + NotFound (integer)', async () => {
        try {
          await app.service('people-customid').remove(123456789)
          throw new Error('Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.name,
            'NotFound',
            'Error is a NotFound Feathers error',
          )
        }
      })

      it('.update + NotFound (integer)', async () => {
        try {
          await app.service('people').update(123456789, {
            name: 'NotFound',
          })
          throw new Error('Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.name,
            'NotFound',
            'Error is a NotFound Feathers error',
          )
        }
      })

      it('.update + NotFound (integer)', async () => {
        try {
          await app.service('people-customid').update(123456789, {
            name: 'NotFound',
          })
          throw new Error('Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.name,
            'NotFound',
            'Error is a NotFound Feathers error',
          )
        }
      })

      it('.patch + NotFound (integer)', async () => {
        try {
          await app.service('people').patch(123456789, {
            name: 'PatchDoug',
          })
          throw new Error('Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.name,
            'NotFound',
            'Error is a NotFound Feathers error',
          )
        }
      })

      it('.patch + NotFound (integer)', async () => {
        try {
          await app.service('people-customid').patch(123456789, {
            name: 'PatchDoug',
          })
          throw new Error('Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.name,
            'NotFound',
            'Error is a NotFound Feathers error',
          )
        }
      })
    })
  })

  describe('Feathers-Sequelize Specific Tests', () => {
    const app = feathers<{
      people: SequelizeService
      orders: SequelizeService
      'custom-getter-setter': SequelizeService
    }>()
      .use(
        'people',
        new SequelizeService({
          Model,
          paginate: {
            default: 10,
          },
          events: ['testing'],
          multi: true,
        }),
      )
      .use(
        'orders',
        new SequelizeService({
          Model: Order,
          multi: true,
          filters: {
            '$person.name$': true,
          },
        }),
      )
      .use(
        'custom-getter-setter',
        new SequelizeService({
          Model: CustomGetterSetter,
          events: ['testing'],
          raw: false,
          multi: true,
        }),
      )

    afterEach(() => app.service('people').remove(null, { query: {} }))

    describe('Common functionality', () => {
      const people = app.service('people')
      let kirsten: any

      beforeEach(async () => {
        kirsten = await people.create({ name: 'Kirsten', age: 30 })
      })

      it('allows querying for null values (#45)', async () => {
        const name = 'Null test'
        await people.create({ name })
        const { data } = (await people.find({
          query: { age: null },
        })) as Paginated<any>

        assert.strictEqual(data.length, 1)
        assert.strictEqual(data[0].name, name)
        assert.strictEqual(data[0].age, null)
      })

      it('cleans up the query prototype', async () => {
        const page = (await people.find({
          query: {
            name: 'Dave',
            __proto__: [],
          },
        })) as Paginated<any>

        assert.strictEqual(page.data.length, 0)
      })

      it('still allows querying with Sequelize operators', async () => {
        const name = 'Age test'
        await people.create({ name, age: 10 })
        const { data } = (await people.find({
          query: { age: { [Op.eq]: 10 } },
        })) as Paginated<any>

        assert.strictEqual(data.length, 1)
        assert.strictEqual(data[0].name, name)
        assert.strictEqual(data[0].age, 10)
      })

      it('$like works', async () => {
        const name = 'Like test'
        await people.create({ name, age: 10 })
        const { data } = (await people.find({
          query: { name: { $like: '%ike%' } },
        })) as Paginated<any>

        assert.strictEqual(data.length, 1)
        assert.strictEqual(data[0].name, name)
        assert.strictEqual(data[0].age, 10)
      })

      it('does not allow raw attribute $select', async () => {
        await assert.rejects(() =>
          people.find({
            // @ts-expect-error test-case
            query: { $select: [['(sqlite_version())', 'x']] },
          }),
        )
      })

      it('hides the Sequelize error in ERROR symbol', async () => {
        try {
          await people.create({
            age: 10,
          })
          assert.ok(false, 'Should never get here')
        } catch (error: any) {
          assert.ok(error[ERROR])
          assert.strictEqual(error.name, 'BadRequest')
        }
      })

      it('correctly persists updates (#125)', async () => {
        const updateName = 'Ryan'

        await people.update(kirsten.id, { name: updateName })

        const updatedPerson = await people.get(kirsten.id)

        assert.strictEqual(updatedPerson.name, updateName)
      })

      it('correctly updates records using optional query param', async () => {
        const updateAge = 40
        const updateName = 'Kirtsten'

        await people.update(
          kirsten.id,
          { name: updateName, age: updateAge },
          {
            query: { name: 'Kirsten' },
          },
        )

        const updatedPerson = await people.get(kirsten.id)

        assert.strictEqual(updatedPerson.age, updateAge)
      })

      it('fails update when query prevents result in no record match for id', async () => {
        const updateAge = 50
        const updateName = 'Kirtsten'

        try {
          await people.update(
            kirsten.id,
            { name: updateName, age: updateAge },
            {
              query: { name: 'John' },
            },
          )
          assert.ok(false, 'Should never get here')
        } catch (error: any) {
          assert.ok(error.message.indexOf('No record found') >= 0)
        }
      })

      it('multi patch with correct sort', async () => {
        const people = app.service('people')
        const john = await people.create({ name: 'John', age: 30 })
        const jane = await people.create({ name: 'Jane', age: 30 })
        const updated = await people.patch(
          null,
          { age: 31 },
          {
            query: {
              id: { $in: [john.id, jane.id] },
              $sort: { name: 1 },
            },
          },
        )

        assert.strictEqual(updated.length, 2)
        assert.strictEqual(updated[0].id, jane.id)
        assert.strictEqual(updated[1].id, john.id)
      })

      it('single patch with $select', async () => {
        const updateName = 'Ryan'

        const result = await people.patch(
          kirsten.id,
          { name: updateName },
          { query: { $select: ['id'] } },
        )

        assert.deepStrictEqual(result, { id: kirsten.id })

        const updatedPerson = await people.get(kirsten.id)

        assert.strictEqual(updatedPerson.name, updateName)
      })

      it('does not use $skip in get()', async () => {
        const result = await people.get(kirsten.id, { query: { $skip: 10 } })

        assert.strictEqual(result.id, kirsten.id)
      })

      it('filterQuery does not convert dates and symbols', () => {
        const mySymbol = Symbol('test')
        const date = new Date()
        const query = {
          test: { sub: date },
          [mySymbol]: 'hello',
        }
        const filtered = app.service('people').filterQuery({ query })

        assert.deepStrictEqual(filtered.query, query)
      })

      it('get works with custom $and', async () => {
        const john = await people.create({ name: 'John', age: 30 })
        const foundJohn = await people.get(john.id, {
          query: { $and: [{ age: 30 }, { status: 'pending' }] },
        })
        assert.strictEqual(foundJohn.id, john.id)
      })
    })

    describe('Association Tests', () => {
      const people = app.service('people')
      const orders = app.service('orders')
      let kirsten: any
      let ryan: any

      beforeEach(async () => {
        kirsten = await people.create({ name: 'Kirsten', age: 30 })

        await orders.create([
          { name: 'Order 1', personId: kirsten.id },
          { name: 'Order 2', personId: kirsten.id },
          { name: 'Order 3', personId: kirsten.id },
        ])

        ryan = await people.create({ name: 'Ryan', age: 30 })
        await orders.create([
          { name: 'Order 4', personId: ryan.id },
          { name: 'Order 5', personId: ryan.id },
          { name: 'Order 6', personId: ryan.id },
        ])
      })

      afterEach(
        async () =>
          await orders
            .remove(null, { query: {} })
            .then(() => people.remove(null, { query: {} })),
      )

      it('find() returns correct total when using includes for non-raw requests #137', async () => {
        const options = { sequelize: { raw: false, include: Order } }

        const result = (await people.find(options)) as Paginated<any>

        assert.strictEqual(result.total, 2)
      })

      it('find() returns correct total when using includes for raw requests', async () => {
        const options = { sequelize: { include: Order } }

        const result = (await people.find(options)) as Paginated<any>

        assert.strictEqual(result.total, 2)
      })

      it('patch() includes associations', async () => {
        const params = { sequelize: { include: Order } }
        const data = { name: 'Patched' }

        const result = await people.patch(kirsten.id, data, params)

        expect(result).to.have.property('orders.id')
      })

      it('patch() includes associations and query', async () => {
        const params = { sequelize: { include: Order } }
        const data = { name: 'Patched' }

        const current = await people.get(kirsten.id, params)

        const result = await people.patch(kirsten.id, data, {
          query: { name: current.name },
          ...params,
        })

        delete current.updatedAt
        // @ts-expect-error test-case
        delete result.updatedAt

        assert.deepStrictEqual(result, { ...current, ...data })
      })

      it('update() includes associations', async () => {
        const params = { sequelize: { include: Order } }
        const data = { name: 'Updated' }

        const result = await people.update(kirsten.id, data, params)

        expect(result).to.have.property('orders.id')
      })

      it('update() includes associations and query', async () => {
        const params = { sequelize: { include: Order } }
        const data = { name: 'Updated' }

        const current = await people.get(kirsten.id, params)

        const result = await people.update(
          kirsten.id,
          {
            ...current,
            ...data,
          },
          {
            query: { name: current.name },
            ...params,
          },
        )

        delete current.updatedAt
        delete result.updatedAt

        assert.deepStrictEqual(result, { ...current, ...data })
      })

      it('remove() includes associations', async () => {
        const params = { sequelize: { include: Order } }

        const result = await people.remove(kirsten.id, params)

        expect(result).to.have.property('orders.id')
      })

      it('can use $dollar.notation$', async () => {
        const result = (await orders.find({
          query: {
            '$person.name$': 'Kirsten',
          },
          sequelize: {
            include: [
              {
                model: Model,
                as: 'person',
              },
            ],
            raw: true,
          },
        })) as any

        expect(
          result.map((x: any) => ({ name: x.name, personId: x.personId })),
        ).to.deep.equal([
          { name: 'Order 1', personId: kirsten.id },
          { name: 'Order 2', personId: kirsten.id },
          { name: 'Order 3', personId: kirsten.id },
        ])
      })
    })

    describe('Custom getters and setters', () => {
      const service = app.service('custom-getter-setter')
      const value = 0
      const updatedValue = value + 1
      const data = { addsOneOnGet: value, addsOneOnSet: value }

      it('calls custom getters and setters (#113)', async () => {
        const created = await service.create(data)
        const createdArray = (await service.create([data])) as any
        const updated = await service.update(created.id, data)
        const patched = (await service.patch(created.id, data)) as any
        const patchedArray = (await service.patch(null, data)) as any
        const removed = (await service.remove(created.id)) as any
        await service.create(data)
        const removedArray = await service.remove(null)

        assert.strictEqual(created.addsOneOnGet, updatedValue)
        assert.strictEqual(createdArray[0].addsOneOnGet, updatedValue)
        assert.strictEqual(updated.addsOneOnGet, updatedValue)
        assert.strictEqual(patched.addsOneOnGet, updatedValue)
        assert.strictEqual(patchedArray[0].addsOneOnGet, updatedValue)
        assert.strictEqual(removed.addsOneOnGet, updatedValue)
        assert.strictEqual(removedArray[0].addsOneOnGet, updatedValue)

        assert.strictEqual(created.addsOneOnSet, updatedValue)
        assert.strictEqual(createdArray[0].addsOneOnSet, updatedValue)
        assert.strictEqual(updated.addsOneOnSet, updatedValue)
        assert.strictEqual(patched.addsOneOnSet, updatedValue)
        assert.strictEqual(patchedArray[0].addsOneOnSet, updatedValue)
      })

      it('can ignore custom getters and setters (#113)', async () => {
        // Getters cannot be ignored
        // https://sequelize.org/api/v7/interfaces/_sequelize_core.index.createoptions#raw
        // Note it says that it ignores "field and virtual setters"
        // bulkCreate/bulkUpdate also do not support raw for getters/setters
        const IGNORE_SETTERS = { sequelize: { raw: true } }
        const created = await service.create(data, IGNORE_SETTERS)
        const updated = await service.update(created.id, data, IGNORE_SETTERS)
        const patched = (await service.patch(
          created.id,
          data,
          IGNORE_SETTERS,
        )) as any

        // This code demonstrates that the raw option does not ignore getters
        // assert.strictEqual(created.addsOneOnGet, updatedValue);
        // assert.strictEqual(updated.addsOneOnGet, updatedValue);
        // assert.strictEqual(patched.addsOneOnGet, updatedValue);

        assert.strictEqual(created.addsOneOnSet, value)
        assert.strictEqual(updated.addsOneOnSet, value)
        assert.strictEqual(patched.addsOneOnSet, value)
      })
    })

    describe('Operators and Whitelist', () => {
      it('merges whitelist and default operators', async () => {
        const app = feathers<{
          'ops-and-whitelist': SequelizeService
        }>()
        const operators = ['$something']
        app.use(
          'ops-and-whitelist',
          new SequelizeService({
            Model,
            operators,
          }),
        )
        const ops = app.service('ops-and-whitelist')
        expect(ops.options.operators).to.deep.equal([
          '$eq',
          '$ne',
          '$gte',
          '$gt',
          '$lte',
          '$lt',
          '$in',
          '$nin',
          '$like',
          '$notLike',
          '$iLike',
          '$notILike',
          '$or',
          '$and',
          '$something',
        ])
      })

      it('fails using operator that IS NOT whitelisted OR default', async () => {
        const app = feathers<{
          'ops-and-whitelist': SequelizeService
        }>()
        app.use(
          'ops-and-whitelist',
          new SequelizeService({
            Model,
          }),
        )
        const ops = app.service('ops-and-whitelist')
        try {
          await ops.find({ query: { name: { $notWhitelisted: 'Beau' } } })
          assert.ok(false, 'Should never get here')
        } catch (error: any) {
          assert.strictEqual(error.name, 'BadRequest')
          assert.strictEqual(
            error.message,
            'Invalid query parameter $notWhitelisted',
          )
        }
      })

      it('succeeds using operator that IS whitelisted OR default', async () => {
        const app = feathers<{
          'ops-and-whitelist': SequelizeService
        }>()
        app.use(
          'ops-and-whitelist',
          new SequelizeService({
            Model,
            whitelist: ['$between'],
            operatorMap: { $between: Op.between },
          }),
        )
        const ops = app.service('ops-and-whitelist')
        await ops.find({ query: { name: { $like: 'Beau' } } })
      })

      it('succeeds using operator that IS whitelisted AND default', async () => {
        const app = feathers<{
          'ops-and-whitelist': SequelizeService
        }>()
        app.use(
          'ops-and-whitelist',
          new SequelizeService({
            Model,
            whitelist: ['$like'],
          }),
        )
        const ops = app.service('ops-and-whitelist')
        await ops.find({ query: { name: { $like: 'Beau' } } })
      })

      it('fails using an invalid operator in the whitelist', async () => {
        const app = feathers<{
          'ops-and-whitelist': SequelizeService
        }>()
        app.use(
          'ops-and-whitelist',
          new SequelizeService({
            Model,
            whitelist: ['$invalidOp'],
          }),
        )
        const ops = app.service('ops-and-whitelist')
        try {
          await ops.find({ query: { name: { $invalidOp: 'Beau' } } })
          assert.ok(false, 'Should never get here')
        } catch (error: any) {
          assert.strictEqual(
            error.message,
            'Invalid query parameter $invalidOp',
          )
        }
      })
    })
  })

  describe('ORM functionality', () => {
    const app = feathers<{
      'raw-people': SequelizeService
      people: SequelizeService
    }>()
    app.use(
      'raw-people',
      new SequelizeService({
        Model,
        events: ['testing'],
        multi: true,
      }),
    )
    const rawPeople = app.service('raw-people')

    describe('Non-raw Service Config', () => {
      app.use(
        'people',
        new SequelizeService({
          Model,
          events: ['testing'],
          multi: true,
          raw: false, // -> this is what we are testing
        }),
      )
      const people = app.service('people')
      let david: any

      beforeEach(async () => {
        david = await people.create({ name: 'David' })
      })

      afterEach(() => people.remove(null, { query: {} }).catch(() => {}))

      it('find() returns model instances', async () => {
        const results = (await people.find()) as any as any[]

        expect(results[0]).to.be.an.instanceof(Model)
      })

      it('find() with `params.sequelize.raw: true` returns raw data', async () => {
        const results = (await people.find({
          sequelize: {
            raw: true,
          },
        })) as any as any[]

        expect(results[0]).to.be.an('object')
        expect(results[0]).to.not.be.instanceOf(Model)
      })

      it('get() returns a model instance', async () => {
        const instance = await people.get(david.id)

        expect(instance).to.be.an.instanceOf(Model)
      })

      it('get() with `params.sequelize.raw: true` returns raw data', async () => {
        const instance = await people.get(david.id, {
          sequelize: { raw: true },
        })

        expect(instance).to.be.an('object')
        expect(instance).to.not.be.instanceOf(Model)
      })

      it('create() returns a model instance', async () => {
        const instance = await people.create({ name: 'Sarah' })

        expect(instance).to.be.an.instanceOf(Model)
      })

      it('create() with `params.sequelize.raw: true` returns raw data', async () => {
        const instance = await people.create(
          { name: 'Sarah' },
          { sequelize: { raw: true } },
        )

        expect(instance).to.be.an('object')
        expect(instance).to.not.be.instanceOf(Model)
      })

      it('bulk create() returns model instances', async () => {
        const results = await people.create([
          { name: 'Sarah' },
          { name: 'Connor' },
        ])

        expect(results.length).to.equal(2)
        expect(results[0]).to.be.an.instanceOf(Model)
        assert.ok(results[0].id)
        assert.ok(results[1].id)
      })

      it('bulk create() with `params.sequelize.raw: true` returns raw data', async () => {
        const results = await people.create(
          [{ name: 'Sarah' }, { name: 'Connor' }],
          { sequelize: { raw: true } },
        )

        expect(results.length).to.equal(2)
        expect(results[0]).to.be.an('object')
        expect(results[0]).to.not.be.instanceOf(Model)
        assert.ok(results[0].id)
        assert.ok(results[1].id)
      })

      it('create() with returning=false returns empty array', async () => {
        // does not work for single requests
        const responseSingle = await people.create(
          { name: 'delete' },
          {
            sequelize: { returning: false },
          },
        )
        expect(responseSingle).to.be.an.instanceOf(Model)

        // works for bulk requests
        const responseMulti = await people.create([{ name: 'delete' }], {
          sequelize: { returning: false },
        })
        expect(responseMulti).to.deep.equal([])
      })

      it('patch() returns a model instance', async () => {
        const instance = await people.patch(david.id, { name: 'Sarah' })

        expect(instance).to.be.an.instanceOf(Model)
      })

      it('bulk patch() returns model instances', async () => {
        const results = await people.patch(null, { name: 'Sarah' })

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an.instanceOf(Model)
      })

      it('bulk patch() with `params.sequelize.raw: true` returns raw data', async () => {
        const results = await people.patch(
          null,
          { name: 'Sarah' },
          { sequelize: { raw: true } },
        )

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an('object')
        expect(results[0]).to.not.be.instanceOf(Model)
      })

      it('patch() with returning=false returns empty array', async () => {
        // does not work for single requests
        const responseSingle = await people.patch(
          david.id,
          { name: 'Sarah' },
          {
            sequelize: { returning: false },
          },
        )
        expect(responseSingle).to.be.an.instanceOf(Model)

        // works for bulk requests
        const responseMulti = await people.patch(
          null,
          { name: 'Sarah' },
          {
            query: { name: 'Sarah' },
            sequelize: { returning: false },
          },
        )

        expect(responseMulti).to.deep.equal([])
      })

      it('update() returns a model instance', async () => {
        const instance = await people.update(david.id, david)

        expect(instance).to.be.an.instanceOf(Model)
      })

      it('update() with `params.sequelize.raw: true` returns raw data', async () => {
        const instance = await people.update(david.id, david, {
          sequelize: { raw: true },
        })

        expect(instance).to.be.an('object')
        expect(instance).to.not.be.instanceOf(Model)
      })

      it('remove() returns a model instance', async () => {
        const instance = await people.remove(david.id)

        expect(instance).to.be.an.instanceOf(Model)
      })

      it('remove() with `params.sequelize.raw: true` returns raw data', async () => {
        const instance = await people.remove(david.id, {
          sequelize: { raw: true },
        })

        expect(instance).to.be.an('object')
        expect(instance).to.not.be.instanceOf(Model)
      })

      it('bulk remove() returns model instances', async () => {
        const results = await people.remove(null, { query: {} })

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an.instanceOf(Model)
      })

      it('bulk remove() with `params.sequelize.raw: true` returns raw data', async () => {
        const results = await people.remove(null, {
          query: {},
          sequelize: { raw: true },
        })

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an('object')
        expect(results[0]).to.not.be.instanceOf(Model)
      })

      it('remove() with returning=false returns empty array', async () => {
        // does not work for single requests
        const responseSingle = await people.remove(david.id, {
          sequelize: { returning: false },
        })
        expect(responseSingle).to.be.an.instanceOf(Model)

        david = await people.create({ name: 'David' })
        const responseMulti = await people.remove(null, {
          query: { name: 'David' },
          sequelize: { returning: false },
        })
        expect(responseMulti).to.deep.equal([])
      })
    })

    describe('raw Service', () => {
      let david: any

      beforeEach(async () => {
        david = await rawPeople.create({ name: 'David' })
      })

      afterEach(() => rawPeople.remove(null, { query: {} }).catch(() => {}))

      it('find() returns raw', async () => {
        const results = (await rawPeople.find()) as any as any[]

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.not.be.an.instanceof(Model)
      })

      it('get() returns raw', async () => {
        const instance = await rawPeople.get(david.id)

        expect(instance).to.not.be.an.instanceof(Model)
      })

      it('create() returns raw', async () => {
        const instance = await rawPeople.create({ name: 'Sarah' })

        expect(instance).to.not.be.an.instanceof(Model)
      })

      it('bulk create() returns raw', async () => {
        const results = await rawPeople.create([{ name: 'Sarah' }])

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.not.be.an.instanceof(Model)
      })

      it('patch() returns raw', async () => {
        const instance = await rawPeople.patch(david.id, { name: 'Sarah' })

        expect(instance).to.not.be.an.instanceof(Model)
      })

      it('bulk patch() returns raw', async () => {
        const results = await rawPeople.patch(
          null,
          { name: 'Sarah' },
          { query: { id: { $in: [david.id] } } },
        )

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.not.be.an.instanceof(Model)
      })

      it('update() returns raw', async () => {
        const instance = await rawPeople.update(david.id, david)

        expect(instance).to.not.be.an.instanceof(Model)
      })

      it('remove() returns raw', async () => {
        const instance = await rawPeople.remove(david.id)

        expect(instance).to.not.be.an.instanceof(Model)
      })

      it('bulk remove() returns raw', async () => {
        const results = await rawPeople.remove(null)

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.not.be.an.instanceof(Model)
      })
    })

    describe('Non-raw Service Method Calls', () => {
      const NOT_RAW = { sequelize: { raw: false } }
      let david: any

      beforeEach(async () => {
        david = await rawPeople.create({ name: 'David' })
      })

      afterEach(() => rawPeople.remove(null, { query: {} }).catch(() => {}))

      it('find() returns raw', async () => {
        const results = (await rawPeople.find()) as any as any[]

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.not.an.instanceof(Model)
      })

      it('`raw: false` works for find()', async () => {
        const results = (await rawPeople.find(NOT_RAW)) as any as any[]

        expect(results[0]).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for get()', async () => {
        const instance = await rawPeople.get(david.id, NOT_RAW)

        expect(instance).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for create()', async () => {
        const instance = await rawPeople.create({ name: 'Sarah' }, NOT_RAW)

        expect(instance).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for bulk create()', async () => {
        const results = await rawPeople.create([{ name: 'Sarah' }], NOT_RAW)

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for patch()', async () => {
        const instance = await rawPeople.patch(
          david.id,
          { name: 'Sarah' },
          NOT_RAW,
        )

        expect(instance).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for bulk patch()', async () => {
        const results = await rawPeople.patch(null, { name: 'Sarah' }, NOT_RAW)

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for update()', async () => {
        const instance = await rawPeople.update(david.id, david, NOT_RAW)

        expect(instance).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for remove()', async () => {
        const instance = await rawPeople.remove(david.id, NOT_RAW)

        expect(instance).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for bulk remove()', async () => {
        const results = await rawPeople.remove(null, NOT_RAW)

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an.instanceof(Model)
      })
    })
  })

  describe('ORM functionality with overridden getModel method', () => {
    const EXPECTED_ATTRIBUTE_VALUE = 42

    function getExtraParams(params?: Record<string, any>) {
      return {
        ...params,
        sequelize: {
          expectedAttribute: EXPECTED_ATTRIBUTE_VALUE,
          getModelCalls: { count: 0 },
          ...params?.sequelize,
        },
      }
    }

    class ExtendedService extends SequelizeService {
      getModel(params: any) {
        if (
          !params.sequelize ||
          params.sequelize.expectedAttribute !== EXPECTED_ATTRIBUTE_VALUE
        ) {
          throw new Error(
            'Expected custom attribute not found in overridden getModel()!',
          )
        }

        if (params.sequelize.getModelCalls === undefined) {
          throw new Error('getModelCalls not defined on params.sequelize!')
        }

        params.sequelize.getModelCalls.count++

        return this.options.Model
      }

      get Model() {
        // Extended service classes that override getModel will often
        // depend upon having certain params provided from further up
        // the call stack (e.g. part of the request object to make a decision
        // on which model/db to return based on the hostname being accessed).
        // If feathers-sequelize wants access to the model, it should always
        // call getModel(params).
        // Returning null here is a way to ensure that a regression isn't
        // introduced later whereby feathers-sequelize attempts to access a
        // model obtained via the Model getter rather than via getModel(params).
        return null as any
      }
    }

    function extendedService(options: SequelizeAdapterOptions) {
      return new ExtendedService(options)
    }

    const app = feathers<{
      'raw-people': ExtendedService
      people: ExtendedService
    }>()
    app.use(
      'raw-people',
      extendedService({
        Model,
        events: ['testing'],
        multi: true,
      }),
    )
    const rawPeople = app.service('raw-people')

    describe('Non-raw Service Config', () => {
      app.use(
        'people',
        extendedService({
          Model,
          events: ['testing'],
          multi: true,
          raw: false, // -> this is what we are testing
        }),
      )
      const people = app.service('people')
      let david: any

      beforeEach(async () => {
        david = await people.create({ name: 'David' }, getExtraParams())
      })

      afterEach(() => people.remove(david.id, getExtraParams()).catch(() => {}))

      it('find() returns model instances', async () => {
        const params = getExtraParams()
        const results = (await people.find(params)) as any as any[]
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(results[0]).to.be.an.instanceof(Model)
      })

      it('get() returns a model instance', async () => {
        const params = getExtraParams()
        const instance = await people.get(david.id, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)
        expect(instance).to.be.an.instanceof(Model)
      })

      it('create() returns a model instance', async () => {
        const params = getExtraParams()
        const instance = await people.create({ name: 'Sarah' }, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(instance).to.be.an.instanceof(Model)

        const removeParams = getExtraParams()
        await people.remove(instance.id, removeParams)
        expect(removeParams.sequelize.getModelCalls.count).to.gte(1)
      })

      it('bulk create() returns model instances', async () => {
        const params = getExtraParams()
        const results = await people.create([{ name: 'Sarah' }], params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an.instanceof(Model)

        const removeParams = getExtraParams()
        await people.remove(results[0].id, removeParams)
        expect(removeParams.sequelize.getModelCalls.count).to.gte(1)
      })

      it('patch() returns a model instance', async () => {
        const params = getExtraParams()
        const instance = await people.patch(david.id, { name: 'Sarah' }, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)
        expect(instance).to.be.an.instanceof(Model)
      })

      it('create() with returning=false returns empty array', async () => {
        const params = getExtraParams({ sequelize: { returning: false } })
        const responseSingle = await people.create({ name: 'delete' }, params)
        const responseMulti = await people.create([{ name: 'delete' }], params)

        expect(responseSingle).to.be.an('object').that.has.property('id')
        expect(responseMulti).to.deep.equal([])

        await people.remove(null, { ...params, query: { name: 'delete' } })
      })

      it('patch() with returning=false returns empty array', async () => {
        const params = getExtraParams({ sequelize: { returning: false } })
        const responseSingle = await people.patch(
          david.id,
          { name: 'Sarah' },
          params,
        )
        const responseMulti = await people.patch(
          null,
          { name: 'Sarah' },
          {
            ...params,
            query: { name: 'Sarah' },
            sequelize: { ...params.sequelize },
          },
        )

        expect(responseSingle)
          .to.be.an('object')
          .with.property('id')
          .that.equals(david.id)
        expect(responseMulti).to.deep.equal([])
      })

      it('update() returns a model instance', async () => {
        const params = getExtraParams()
        const instance = await people.update(david.id, david, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)
        expect(instance).to.be.an.instanceof(Model)
      })

      it('remove() returns a model instance', async () => {
        const params = getExtraParams()
        const instance = await people.remove(david.id, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(instance).to.be.an.instanceof(Model)
      })

      it('remove() with returning=false returns empty array', async () => {
        const params = getExtraParams({ sequelize: { returning: false } })
        const responseSingle = await people.remove(david.id, params)
        david = await people.create({ name: 'David' }, params)
        const responseMulti = await people.remove(null, {
          ...params,
          query: { name: 'David' },
        })

        expect(responseSingle).to.be.an('object').that.has.property('id')
        expect(responseMulti).to.deep.equal([])
      })
    })

    describe('Non-raw Service Method Calls', () => {
      const NOT_RAW = { raw: false }

      let david: any

      beforeEach(async () => {
        david = await rawPeople.create({ name: 'David' }, getExtraParams())
      })

      afterEach(() =>
        rawPeople.remove(david.id, getExtraParams()).catch(() => {}),
      )

      it('`raw: false` works for find()', async () => {
        const params = getExtraParams({ sequelize: NOT_RAW })
        const results = (await rawPeople.find(params)) as any as any[]
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(results[0]).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for get()', async () => {
        const params = getExtraParams({ sequelize: NOT_RAW })
        const instance = await rawPeople.get(david.id, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(instance).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for create()', async () => {
        const params = getExtraParams({ sequelize: NOT_RAW })
        const instance = await rawPeople.create({ name: 'Sarah' }, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(instance).to.be.an.instanceof(Model)

        const removeParams = getExtraParams()
        await rawPeople.remove(instance.id, removeParams)
        expect(removeParams.sequelize.getModelCalls.count).to.gte(1)
      })

      it('`raw: false` works for bulk create()', async () => {
        const params = getExtraParams({ sequelize: NOT_RAW })
        const results = await rawPeople.create([{ name: 'Sarah' }], params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(results).to.be.an('array').with.lengthOf(1)
        expect(results[0]).to.be.an.instanceof(Model)

        const removeParams = getExtraParams()
        await rawPeople.remove(results[0].id, removeParams)
        expect(removeParams.sequelize.getModelCalls.count).to.gte(1)
      })

      it('`raw: false` works for patch()', async () => {
        const params = getExtraParams({ sequelize: NOT_RAW })
        const instance = await rawPeople.patch(
          david.id,
          { name: 'Sarah' },
          params,
        )
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(instance).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for update()', async () => {
        const params = getExtraParams({ sequelize: NOT_RAW })
        const instance = await rawPeople.update(david.id, david, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(instance).to.be.an.instanceof(Model)
      })

      it('`raw: false` works for remove()', async () => {
        const params = getExtraParams({ sequelize: NOT_RAW })
        const instance = await rawPeople.remove(david.id, params)
        expect(params.sequelize.getModelCalls.count).to.gte(1)

        expect(instance).to.be.an.instanceof(Model)
      })
    })
  })
})
