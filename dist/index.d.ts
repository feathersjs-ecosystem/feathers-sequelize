import * as _feathersjs_adapter_commons from '@feathersjs/adapter-commons';
import { AdapterQuery, AdapterParams, AdapterServiceOptions, AdapterBase, PaginationOptions } from '@feathersjs/adapter-commons';
import * as sequelize from 'sequelize';
import { ModelStatic, Includeable, Op } from 'sequelize';
import { Query, NullableId, Paginated, Id, PaginationOptions as PaginationOptions$1, HookContext, Params, ServiceMethods } from '@feathersjs/feathers';

interface SequelizeAdapterOptions extends AdapterServiceOptions {
    Model: ModelStatic<any>;
    raw?: boolean;
    operatorMap?: Record<string, symbol>;
}
interface SequelizeAdapterParams<Q = AdapterQuery> extends AdapterParams<Q, Partial<SequelizeAdapterOptions>> {
    sequelize?: any;
}
type HydrateOptions = {
    include?: Includeable | Includeable[];
};

declare class SequelizeAdapter<Result, Data = Partial<Result>, ServiceParams extends SequelizeAdapterParams = SequelizeAdapterParams, PatchData = Partial<Data>> extends AdapterBase<Result, Data, PatchData, ServiceParams, SequelizeAdapterOptions> {
    constructor(options: SequelizeAdapterOptions);
    get raw(): boolean;
    /**
     *
     * @deprecated Use `Op` from `sequelize` directly
     */
    get Op(): typeof Op;
    get Model(): sequelize.ModelStatic<any>;
    getModel(_params?: ServiceParams): sequelize.ModelStatic<any>;
    convertOperators(q: any): Query;
    filterQuery(params: ServiceParams): {
        filters: {
            [key: string]: any;
        };
        query: Query;
        paginate: _feathersjs_adapter_commons.PaginationParams | undefined;
    };
    paramsToAdapter(id: NullableId, _params?: ServiceParams): any;
    handleError(feathersError: any, _sequelizeError: any): void;
    _find(params?: ServiceParams & {
        paginate?: PaginationOptions;
    }): Promise<Paginated<Result>>;
    _find(params?: ServiceParams & {
        paginate: false;
    }): Promise<Result[]>;
    _find(params?: ServiceParams): Promise<Paginated<Result> | Result[]>;
    _get(id: Id, params?: ServiceParams): Promise<Result>;
    _create(data: Data, params?: ServiceParams): Promise<Result>;
    _create(data: Data[], params?: ServiceParams): Promise<Result[]>;
    _create(data: Data | Data[], params?: ServiceParams): Promise<Result | Result[]>;
    _patch(id: null, data: PatchData, params?: ServiceParams): Promise<Result[]>;
    _patch(id: Id, data: PatchData, params?: ServiceParams): Promise<Result>;
    _update(id: Id, data: Data, params?: ServiceParams): Promise<Result>;
    _remove(id: null, params?: ServiceParams): Promise<Result[]>;
    _remove(id: Id, params?: ServiceParams): Promise<Result>;
}

type PaginatedOrArray<R, P = undefined> = P extends {
    paginate: false;
} ? R[] : P extends {
    paginate: PaginationOptions$1;
} ? Paginated<R> : Paginated<R> | R[];

declare const dehydrate: <H extends HookContext = HookContext>() => (context: H) => Promise<Awaited<H>>;

declare const hydrate: <H extends HookContext = HookContext>(options?: HydrateOptions) => (context: H) => Promise<Awaited<H>>;

declare const ERROR: unique symbol;
declare const errorHandler: (error: any) => never;

declare class SequelizeService<Result = any, Data = Partial<Result>, ServiceParams extends Params<any> = SequelizeAdapterParams, PatchData = Partial<Data>> extends SequelizeAdapter<Result, Data, ServiceParams, PatchData> implements ServiceMethods<Result | Paginated<Result>, Data, ServiceParams, PatchData> {
    find<P extends ServiceParams & {
        paginate?: PaginationOptions | false;
    }>(params?: P): Promise<PaginatedOrArray<Result, P>>;
    get(id: Id, params?: ServiceParams): Promise<Result>;
    create(data: Data, params?: ServiceParams): Promise<Result>;
    create(data: Data[], params?: ServiceParams): Promise<Result[]>;
    create(data: Data | Data[], params?: ServiceParams): Promise<Result | Result[]>;
    update(id: Id, data: Data, params?: ServiceParams): Promise<Result>;
    patch(id: Id, data: PatchData, params?: ServiceParams): Promise<Result>;
    patch(id: null, data: PatchData, params?: ServiceParams): Promise<Result[]>;
    remove(id: Id, params?: ServiceParams): Promise<Result>;
    remove(id: null, params?: ServiceParams): Promise<Result[]>;
}

export { ERROR, type HydrateOptions, SequelizeAdapter, type SequelizeAdapterOptions, type SequelizeAdapterParams, SequelizeService, dehydrate, errorHandler, hydrate };
