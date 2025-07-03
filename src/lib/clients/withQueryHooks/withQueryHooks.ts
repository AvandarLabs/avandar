import { DefaultError, QueryClient, QueryKey } from "@tanstack/react-query";
import { useMutation, UseMutationOptions } from "@/lib/hooks/query/useMutation";
import { useQuery } from "@/lib/hooks/query/useQuery";
import { AnyFunction } from "../../types/utilityTypes";
import { isFunction, isPlainObject } from "../../utils/guards";
import { objectKeys } from "../../utils/objects/misc";
import { excludeDeep } from "../../utils/objects/transformations";
import { capitalize, prefix } from "../../utils/strings/transformations";
import { BaseClient } from "../BaseClient";
import {
  ClientFnFirstParameter,
  ClientWithCache,
  ExtraUseClientMutationArgs,
  HookableFnName,
  QueryFnsRecord,
  QueryKeysRecord,
  UseClientQueryArg,
  UseMutationFunctionsRecord,
  UseQueryFunctionsRecord,
  WithQueryHooks,
} from "./types";

function isSingleArgObject(arg: unknown): arg is { arg: unknown } {
  return isPlainObject(arg) && "arg" in arg && objectKeys(arg).length === 1;
}

type ClientFnReturnType<
  Client extends BaseClient,
  FnName extends keyof Client,
> = Client[FnName] extends AnyFunction ? ReturnType<Client[FnName]> : never;

/**
 * Augments an object with `use` hooks that wrap any specified functions
 * with `useQuery` or `useMutation`.
 *
 * @param client The client to add query hooks to.
 * @param options.queryFns The query functions to add hooks for.
 * @param options.mutationFns The mutation functions to add hooks for.
 *   Mutations do not invalidate any queries by default.
 *   You can pass the `invalidateGetAllQuery` option to invalidate
 *   the 'getAll' query of the client after the mutation.
 *   Other specific queries can be invalidated by passing
 *   `queriesToInvalidate` or `queryToInvalidate` options when
 *   calling the `Client.use[Mutation]` function.
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
  // create a lookup of cached clients so we can reuse clients when
  // `.withCache()` is called to create a new client
  const cachedClientsLookup = new WeakMap<
    QueryClient,
    ClientWithCache<WithQueryHooks<Client, UseQueryFnName, UseMutationFnName>>
  >();

  const callableQueryFnNames = queryFns.filter((queryFnName) => {
    return (
      queryFnName in client &&
      typeof client[queryFnName as UseQueryFnName] === "function"
    );
  });

  const queryKeyBuilders = {} as QueryKeysRecord<Client, UseQueryFnName>;
  const useQueryFnsRecord = {} as UseQueryFunctionsRecord<
    Client,
    UseQueryFnName
  >;
  const useMutationFnsRecord = {} as UseMutationFunctionsRecord<
    Client,
    UseMutationFnName
  >;

  // set up all the `useQuery` functions
  callableQueryFnNames.forEach((queryFnName) => {
    const clientFunction = client[queryFnName as UseQueryFnName];
    if (typeof clientFunction === "function") {
      const boundClientFunction = clientFunction.bind(client);

      // make the query key builder for this `queryFnName`
      const queryKeyBuilder = (
        param: ClientFnFirstParameter<Client, UseQueryFnName>,
      ) => {
        return makeQueryKey(client, queryFnName, param);
      };

      // @ts-expect-error This is safe
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
      useQueryFnsRecord[prefix("use", capitalize(queryFnName))] =
        useClientQuery;
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
            newQueriesToInvalidate = [
              ...(newQueriesToInvalidate ?? []),
              queryKeyBuilders["getAll"](),
            ];
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
        useMutationFnsRecord[prefix("use", capitalize(mutationFnName))] =
          useClientMutation;
      }
    });

  const returnClient = {
    ...client,
    ...useQueryFnsRecord,
    ...useMutationFnsRecord,
    QueryKeys: queryKeyBuilders,

    // Create the `withCache` function to augment this client with a QueryClient
    withCache: (
      queryClient: QueryClient,
    ): ClientWithCache<
      WithQueryHooks<Client, UseQueryFnName, UseMutationFnName>
    > => {
      if (cachedClientsLookup.has(queryClient)) {
        return cachedClientsLookup.get(queryClient)!;
      }

      const cachedClientsByFnNameLookup = new Map<
        string,
        ClientWithCache<
          WithQueryHooks<Client, UseQueryFnName, UseMutationFnName>
        >
      >();

      const clientWithCache: ClientWithCache<
        WithQueryHooks<Client, UseQueryFnName, UseMutationFnName>
      > = {
        ...returnClient,

        // wrap all query functions in `queryClient.ensureQueryData`
        withEnsureQueryData: (): ClientWithCache<
          WithQueryHooks<Client, UseQueryFnName, UseMutationFnName>
        > => {
          if (cachedClientsByFnNameLookup.has("withEnsureQueryData")) {
            return cachedClientsByFnNameLookup.get("withEnsureQueryData")!;
          }
          const wrappedQueries = {} as QueryFnsRecord<Client, UseQueryFnName>;

          callableQueryFnNames.forEach((queryFnName: UseQueryFnName) => {
            const clientFunction = client[queryFnName as UseQueryFnName];
            if (typeof clientFunction === "function") {
              const boundClientFunction = clientFunction.bind(client);
              const wrappedQuery = async (
                params: ClientFnFirstParameter<Client, UseQueryFnName>,
              ) => {
                const data = await queryClient.ensureQueryData<
                  ClientFnReturnType<Client, UseQueryFnName>
                >({
                  queryKey: queryKeyBuilders[queryFnName](params),
                  queryFn: boundClientFunction,
                });
                return data;
              };

              // @ts-expect-error This is safe
              wrappedQueries[queryFnName] = wrappedQuery;
            }
          });

          const withEnsureQueryDataClient = {
            ...clientWithCache,
            ...wrappedQueries,
          };
          cachedClientsByFnNameLookup.set(
            "withEnsureQueryData",
            withEnsureQueryDataClient,
          );
          return withEnsureQueryDataClient;
        },
      };

      cachedClientsLookup.set(queryClient, clientWithCache);
      return clientWithCache;
    },
  };

  return returnClient;
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
  const newParams = excludeDeep(params, isFunction);
  return [client.getClientName(), queryFnName, newParams];
}

export type { WithQueryHooks };
export type { HookableFnName };
