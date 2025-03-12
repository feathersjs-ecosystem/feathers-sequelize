import type { Paginated, PaginationOptions } from '@feathersjs/feathers'

export type PaginatedOrArray<R, P = undefined> = P extends { paginate: false }
  ? R[]
  : P extends { paginate: PaginationOptions }
    ? Paginated<R>
    : Paginated<R> | R[]
