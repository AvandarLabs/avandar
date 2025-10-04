import { DefaultError, QueryClient, QueryKey } from "@tanstack/react-query";
import { ConditionalKeys, Simplify } from "type-fest";
import {
  UseMutationOptions,
  UseMutationResultTuple,
} from "@/lib/hooks/query/useMutation";
import {
  UseQueryOptions,
  UseQueryResultTuple,
} from "@/lib/hooks/query/useQuery";
import {
  AnyFunction,
  AnyFunctionWithReturn,
  AnyFunctionWithSignature,
} from "@/lib/types/utilityTypes";
import { BaseClient } from "../BaseClient";

/**
 * A union of all function names that have a *single* argument and
 * return a Promise. These functions are eligible to be wrapped in
 * `useQuery` or `useMutation` hooks.
 */
export type HookableFnName<T extends object> = Extract<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ConditionalKeys<T, AnyFunctionWithSignature<[any], Promise<unknown>>>,
  string
>;

/**
 * Get the first parameter of a function's array of parameters.
 */
export type ClientFnFirstParameter<
  Client extends BaseClient,
  FnName extends keyof Client,
  Fn extends Client[FnName] = Client[FnName],
> =
  Fn extends AnyFunction ?
    undefined extends Parameters<Fn>[0] ?
      void | Parameters<Fn>[0]
    : Parameters<Fn>[0]
  : never;

type RefinedQueryOptions = Omit<UseQueryOptions, "queryFn" | "queryKey">;

/**
 * Helper type to generate the argument for a client's `useQuery` wrapper
 * function.
 */
export type UseClientQueryArg<
  Client extends BaseClient,
  FnName extends keyof Client,
  ClientParam extends ClientFnFirstParameter<
    Client,
    FnName
  > = ClientFnFirstParameter<Client, FnName>,
> =
  [Exclude<ClientParam, void>] extends [never] ?
    { useQueryOptions?: RefinedQueryOptions } | void
  : undefined extends ClientParam ?
    Simplify<
      NonNullable<ClientParam> extends object ?
        | (NonNullable<ClientParam> & { useQueryOptions?: RefinedQueryOptions })
        | void
      : | ({ arg?: NonNullable<ClientParam> } & {
            useQueryOptions?: RefinedQueryOptions;
          })
        | void
    >
  : ClientParam extends object ?
    ClientParam & { useQueryOptions?: RefinedQueryOptions }
  : { arg: ClientParam } & { useQueryOptions?: RefinedQueryOptions };

/**
 * Helper type to generate a function that returns a `QueryKey`
 * given a client function parameter.
 */
export type ClientQueryKeyBuilderFn<
  Client extends BaseClient,
  FnName extends keyof Client,
> = (param: ClientFnFirstParameter<Client, FnName>) => QueryKey;

export type ExtraUseClientMutationArgs = {
  /**
   * If this gets passed, the 'getAll' query of the client
   * will be invalidated after the mutation.
   *
   * Other specific queries can be invalidated by passing
   * `queriesToInvalidate` or `queryToInvalidate` options when
   * calling the `Client.use[Mutation]` function.
   */
  invalidateGetAllQuery?: boolean;
};

export type UseQueryFunctionsRecord<
  Client extends BaseClient,
  QueryFnName extends HookableFnName<Client>,
> = {
  [QName in QueryFnName as `use${Capitalize<QName>}`]: Client[QName] extends (
    AnyFunctionWithReturn<Promise<infer Result>>
  ) ?
    (options: UseClientQueryArg<Client, QName>) => UseQueryResultTuple<Result>
  : never;
};

export type UseMutationFunctionsRecord<
  Client extends BaseClient,
  MutationFnName extends HookableFnName<Client>,
> = {
  [MutName in MutationFnName as `use${Capitalize<MutName>}`]: Client[MutName] extends (
    AnyFunctionWithSignature<infer Params, Promise<infer Result>>
  ) ?
    (
      useMutationOptions?: Simplify<
        Omit<
          UseMutationOptions<Result, Params[0], DefaultError, unknown>,
          "mutationFn"
        > &
          ExtraUseClientMutationArgs
      >,
    ) => UseMutationResultTuple<Result, Params[0], DefaultError, unknown>
  : never;
};

export type QueryKeysRecord<
  Client extends BaseClient,
  QueryFnName extends HookableFnName<Client>,
> = {
  [QName in QueryFnName]: Client[QName] extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnyFunctionWithReturn<Promise<any>>
  ) ?
    ClientQueryKeyBuilderFn<Client, QName>
  : never;
};

export type QueryFnsRecord<
  Client extends BaseClient,
  QueryFnName extends HookableFnName<Client>,
> = {
  [QName in QueryFnName]: Client[QName] extends (
    AnyFunctionWithReturn<Promise<infer Result>>
  ) ?
    (options: ClientFnFirstParameter<Client, QName>) => Promise<Result>
  : never;
};

/**
 * Augments a CRUD Model Client instance with `use` hooks that call
 * `useQuery` or `useMutation` and return the appropriate types.
 * We only convert functions that return a Promise to a `use` hook.
 *
 * In addition, we also attach a `withQueryClient(queryClient)` function
 * that returns a new record of all the query functions, except they
 * will internally use the @tanstack/react-query `queryClient` to
 * fetch the data. This means it will automatically use the queryClient's
 * internal caching logic.
 */
export type WithQueryHooks<
  Client extends BaseClient,
  QueryFnName extends HookableFnName<Client>,
  MutationFnName extends HookableFnName<Client>,
> = Client &
  UseQueryFunctionsRecord<Client, QueryFnName> &
  UseMutationFunctionsRecord<Client, MutationFnName> & {
    QueryKeys: QueryKeysRecord<Client, QueryFnName>;

    /**
     * Connects this client to the react-query `QueryClient` so that the
     * non-hook queries can use the query client's internal caching logic.
     *
     * This returns an object of `with[QueryClientFunctionName]` functions
     * that create new clients where all non-hook queries are wrapped in
     * the specified queryClient function.
     *
     * This is helpful so you can use your clients in a route's loader
     * and also in the React components, but have them use the same cache.
     *
     * **NOTE**: this function is only wrapping the query functions, not the
     * mutation functions.
     *
     * Examples:
     * ```ts
     *   await MyClient
     *     .withCache(queryClient)
     *     .withEnsureQueryData()
     *     .getAll();
     * ```
     *
     * The above will call `.getAll()`, but will wrap it in
     * `queryClient.ensureQueryData` so it can use react-query's caching logic.
     *
     * ```ts
     *   await MyClient
     *     .withCache(queryClient)
     *     .withFetchQuery()
     *     .getAll();
     * ```
     *
     * The above will call `.getAll()` but will wrap it in
     * `queryClient.fetchQuery` so it can use react-query's caching logic.
     *
     * @param queryClient The query client to use.
     * @returns A new client with query functions wrapped in
     *   `queryClient` methods.
     */
    withCache: (
      queryClient: QueryClient,
    ) => ClientWithCache<WithQueryHooks<Client, QueryFnName, MutationFnName>>;
  };

export type ClientWithCache<
  ClientWithQueries extends WithQueryHooks<
    BaseClient,
    HookableFnName<BaseClient>,
    HookableFnName<BaseClient>
  >,
> = ClientWithQueries & {
  /**
   * Return a new client with all query functions wrapped in
   * `queryClient.ensureQueryData()`.
   *
   * `ensureQueryData` will always return data if it exists
   * in the cache, even if the data is stale. Data will only
   * be refetched if the query does not exist in the cache.
   *
   * For a deeper explanation of how `ensureQueryData` works, see the
   * [Tanstack Query documentation](https://tanstack.com/query/v4/docs/reference/QueryClient#queryclientensurequerydata)
   */
  withEnsureQueryData: () => ClientWithCache<ClientWithQueries>;

  /**
   * Return a new client with all query functions wrapped in
   * `queryClient.fetchQuery()`.
   *
   * `fetchQuery` will return data from the cache **only**
   * if the query has not been invalidated and the data is not
   * stale. Otherwise it will refetch.
   *
   * For a deeper explanation of how `fetchQuery` works, see the
   * [Tanstack Query documentation](https://tanstack.com/query/v4/docs/reference/QueryClient#queryclientfetchquery)
   */
  withFetchQuery: () => ClientWithCache<ClientWithQueries>;
};
