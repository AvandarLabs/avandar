import { DefaultError, QueryKey } from "@tanstack/react-query";
import { ConditionalKeys, Simplify } from "type-fest";
import {
  useMutation,
  UseMutationOptions,
  UseMutationResultTuple,
} from "@/lib/hooks/query/useMutation";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResultTuple,
} from "@/lib/hooks/query/useQuery";
import { capitalize, prefix } from "@/lib/utils/strings";
import {
  AnyFunction,
  AnyFunctionWithReturn,
  AnyFunctionWithSignature,
} from "../types/utilityTypes";
import { isFunction, isPlainObject } from "../utils/guards";
import { deepExclude, objectKeys } from "../utils/objects";
import { BaseClient } from "./BaseClient";

function isSingleArgObject(arg: unknown): arg is { arg: unknown } {
  return isPlainObject(arg) && "arg" in arg && objectKeys(arg).length === 1;
}

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
type ClientFnFirstParameter<
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
type UseClientQueryArg<
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
type ClientQueryKeyBuilder<
  Client extends BaseClient,
  FnName extends keyof Client,
> = (param: ClientFnFirstParameter<Client, FnName>) => QueryKey;

type ClientFnReturnType<
  Client extends BaseClient,
  FnName extends keyof Client,
> = Client[FnName] extends AnyFunction ? ReturnType<Client[FnName]> : never;

type ExtraUseClientMutationArgs = {
  invalidateGetAllQuery?: boolean;
};

/**
 * Augments a CRUD Model Client instance with `use` hooks that call
 * `useQuery` or `useMutation` and return the appropriate types.
 * We only convert functions that return a Promise to a `use` hook.
 */
export type WithQueryHooks<
  Client extends BaseClient,
  QueryFnName extends HookableFnName<Client>,
  MutationFnName extends HookableFnName<Client>,
> = Client & {
  [QName in QueryFnName as `use${Capitalize<QName>}`]: Client[QName] extends (
    AnyFunctionWithReturn<Promise<infer Result>>
  ) ?
    (options: UseClientQueryArg<Client, QName>) => UseQueryResultTuple<Result>
  : never;
} & {
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
} & {
  QueryKeys: {
    [QName in QueryFnName]: Client[QName] extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AnyFunctionWithReturn<Promise<any>>
    ) ?
      ClientQueryKeyBuilder<Client, QName>
    : never;
  };
};

/**
 * Augments an object with `use` hooks that wrap any specified functions
 * with `useQuery` or `useMutation`.
 *
 * @param client The client to add query hooks to.
 * @param options.queryFns The query functions to add hooks for.
 * @param options.mutationFns The mutation functions to add hooks for.
 * @returns The client with query hooks added.
 */
export function withQueryHooks<
  Client extends BaseClient,
  UseQueryFnName extends HookableFnName<Client>,
  UseMutationFnName extends HookableFnName<Client>,
>(
  client: Client,
  {
    queryFns = [],
    mutationFns = [],
  }: {
    queryFns?: readonly UseQueryFnName[];
    mutationFns?: readonly UseMutationFnName[];
  } = {},
): WithQueryHooks<Client, UseQueryFnName, UseMutationFnName> {
  const queryKeyBuilders = {} as Record<
    UseQueryFnName,
    ClientQueryKeyBuilder<Client, UseQueryFnName>
  >;

  // set up all the `useQuery` functions
  queryFns
    .filter((queryFnName) => {
      return (
        queryFnName in client &&
        typeof client[queryFnName as UseQueryFnName] === "function"
      );
    })
    .forEach((queryFnName) => {
      const clientFunction = client[queryFnName as UseQueryFnName];
      if (typeof clientFunction === "function") {
        const boundClientFunction = clientFunction.bind(client);

        // make the query key builder for this `queryFnName`
        const queryKeyBuilder = (
          param: ClientFnFirstParameter<Client, UseQueryFnName>,
        ) => {
          return makeQueryKey(client, queryFnName, param);
        };
        queryKeyBuilders[queryFnName] = queryKeyBuilder;

        // make the wrapped `useQuery` function for this `queryFnName`
        const useClientQuery = (
          options: UseClientQueryArg<Client, UseQueryFnName>,
        ) => {
          const { useQueryOptions, ...clientFnParamsObj } =
            isPlainObject(options) ? options : { useQueryOptions: undefined };
          const clientFnParam = (
            isSingleArgObject(clientFnParamsObj) ? clientFnParamsObj.arg
              // treat an empty object as undefined
            : objectKeys(clientFnParamsObj).length === 0 ? undefined
            : clientFnParamsObj) as ClientFnFirstParameter<
            Client,
            UseQueryFnName
          >;

          return useQuery({
            queryKey: queryKeyBuilder(clientFnParam),
            queryFn: async () => {
              const result = await boundClientFunction(clientFnParam);
              return result;
            },
            ...(isPlainObject(useQueryOptions) ? useQueryOptions : undefined),
          });
        };

        // @ts-expect-error This is safe
        client[prefix("use", capitalize(queryFnName))] = useClientQuery;
      }
    });

  // set up all the `useMutation` functions
  mutationFns
    .filter((mutationFnName) => {
      return (
        mutationFnName in client &&
        typeof client[mutationFnName as UseMutationFnName] === "function"
      );
    })
    .forEach((mutationFnName) => {
      const clientFunction = client[mutationFnName as UseMutationFnName];
      if (typeof clientFunction === "function") {
        const boundClientFunction = clientFunction.bind(client);

        // make the wrapped `useMutation` function for this `mutationFnName`
        const useClientMutation = (
          useMutationOptions?: Omit<
            UseMutationOptions<
              ClientFnReturnType<Client, UseMutationFnName>,
              ClientFnFirstParameter<Client, UseMutationFnName>,
              DefaultError,
              unknown
            >,
            "mutationFn"
          > &
            ExtraUseClientMutationArgs,
        ) => {
          const {
            invalidateGetAllQuery,
            queryToInvalidate,
            queriesToInvalidate,
            ...moreOptions
          } = useMutationOptions ?? {};

          // get the query keys to invalidate
          const singletonQueryToInvalidate =
            queryToInvalidate ? [queryToInvalidate] : undefined;
          // if `queriesToInvalidate` is set, it takes precedence over the
          // singleton `queryToInvalidate` parameter
          let newQueriesToInvalidate =
            queriesToInvalidate ?? singletonQueryToInvalidate ?? undefined;

          // if `invalidateGetAllQuery` is set, add the `getAll` query key
          if (
            invalidateGetAllQuery &&
            "getAll" in queryKeyBuilders &&
            typeof queryKeyBuilders["getAll"] === "function"
          ) {
            newQueriesToInvalidate = (newQueriesToInvalidate ?? []).concat([
              queryKeyBuilders["getAll"](),
            ]);
          }

          return useMutation({
            // we only allow single-argument functions. If multiple arguments
            // are defined in the Client, we will only take the first one.
            mutationFn: async (
              params: ClientFnFirstParameter<Client, UseMutationFnName>,
            ): Promise<ClientFnReturnType<Client, UseMutationFnName>> => {
              const result = await boundClientFunction(params);
              return result;
            },
            queriesToInvalidate: newQueriesToInvalidate,
            ...moreOptions,
          });
        };

        // @ts-expect-error This is safe
        client[prefix("use", capitalize(mutationFnName))] = useClientMutation;
      }
    });

  // assign the query key builders to the client
  // @ts-expect-error This is safe
  client.QueryKeys = queryKeyBuilders;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any;
}

/**
 * Creates a query key for a given client, function name, and params.
 * @param client The client to create the query key for.
 * @param queryFnName The name of the query function.
 * @param params The parameters for the query function.
 * @returns The query key.
 */
function makeQueryKey<Client extends BaseClient, FnName extends keyof Client>(
  client: Client,
  queryFnName: FnName,
  params: ClientFnFirstParameter<Client, FnName>,
): QueryKey {
  // exclude any functions from the params, they aren't good to include
  // in a query key
  const newParams = deepExclude(params, isFunction);
  return [client.getClientName(), queryFnName, newParams];
}
