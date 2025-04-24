import {
  DefaultError,
  QueryKey,
  UseMutationOptions,
} from "@tanstack/react-query";
import { Simplify } from "type-fest";
import {
  useMutation,
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
  KeysThatMapTo,
} from "../types/utilityTypes";
import { isFunction } from "../utils/guards";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";
import { deepExclude } from "../utils/objects";
import { ModelCRUDClient } from "./ModelCRUDClient";

type ClientObject = object & { getModelName: () => string };

/**
 * A union of all function names that have a *single* argument and
 * return a Promise. These functions are eligible to be wrapped in
 * `useQuery` or `useMutation` hooks.
 */
export type HookableFnName<T extends object> = Extract<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  KeysThatMapTo<AnyFunctionWithSignature<[any], Promise<unknown>>, T>,
  string
>;

/**
 * Get the first parameter of a function's array of parameters.
 */
type ClientFnFirstParameter<
  Client extends ClientObject,
  FnName extends keyof Client,
  Fn extends Client[FnName] = Client[FnName],
> =
  Fn extends AnyFunction ?
    undefined extends Parameters<Fn>[0] ?
      void | Parameters<Fn>[0]
    : Parameters<Fn>[0]
  : never;

type ClientFnReturnType<
  Client extends ClientObject,
  FnName extends keyof Client,
> = Client[FnName] extends AnyFunction ? ReturnType<Client[FnName]> : never;

/**
 * A default list of query functions to turn into `use` hooks in a CRUD client.
 * They will wrap `useQuery`.
 */
const DEFAULT_QUERY_FN_NAMES = [
  "getById",
  "getAll",
] as const satisfies ReadonlyArray<
  HookableFnName<ModelCRUDClient<ModelCRUDTypes>>
>;

/**
 * A default list of mutation functions to turn into `use` hooks in a CRUD
 * client. They will wrap `useMutation`.
 */
const DEFAULT_MUTATION_FN_NAMES = [
  "insert",
  "update",
  "delete",
] as const satisfies ReadonlyArray<
  HookableFnName<ModelCRUDClient<ModelCRUDTypes>>
>;

/**
 * Augments a CRUD Model Client instance with `use` hooks that call
 * `useQuery` or `useMutation` and return the appropriate types.
 * We only convert functions that return a Promise to a `use` hook.
 */
export type WithQueryHooks<
  Client extends ClientObject,
  QueryFnName extends keyof Client = never,
  MutationFnName extends keyof Client = never,
> = Client & {
  [QName in [QueryFnName] extends [never] ?
    Extract<keyof Client, (typeof DEFAULT_QUERY_FN_NAMES)[number]>
  : Extract<
      QueryFnName,
      string
    > as `use${Capitalize<QName>}`]: Client[QName] extends (
    AnyFunctionWithReturn<Promise<infer Result>>
  ) ?
    (
      clientFnParams: ClientFnFirstParameter<Client, QName>,
      useQueryOptions?: Simplify<
        Omit<UseQueryOptions<Result>, "queryFn" | "queryKey">
      >,
    ) => UseQueryResultTuple<Result>
  : never;
} & {
  [MutName in [MutationFnName] extends [never] ?
    Extract<keyof Client, (typeof DEFAULT_MUTATION_FN_NAMES)[number]>
  : Extract<
      MutationFnName,
      string
    > as `use${Capitalize<MutName>}`]: Client[MutName] extends (
    AnyFunctionWithSignature<infer Params, Promise<infer Result>>
  ) ?
    (
      useMutationOptions?: Simplify<
        Omit<
          UseMutationOptions<Result, DefaultError, Params[0], unknown>,
          "mutationFn"
        >
      >,
    ) => UseMutationResultTuple<Result, DefaultError, Params[0], unknown>
  : never;
};

/**
 * Augments an object with `use` hooks that wrap any specified functions
 * with `useQuery` or `useMutation`.
 *
 * If no query or mutation function names are provided, we attempt to
 * add hooks for `DEFAULT_QUERY_FN_NAMES` and `DEFAULT_MUTATION_FN_NAMES`.
 *
 * @param client The client to add query hooks to.
 * @param options.queryFns The query functions to add hooks for. If
 * this argument is not provided, we add `useQuery` hooks for the
 * function names in `DEFAULT_QUERY_FN_NAMES`.
 * @param options.mutationFns The mutation functions to add hooks for. If
 * this argument is not provided, we add `useMutation` hooks for the
 * function names in `DEFAULT_MUTATION_FN_NAMES`.
 * @returns The client with query hooks added.
 */
export function withQueryHooks<
  Client extends ClientObject,
  UseQueryFnName extends HookableFnName<Client> = never,
  UseMutationFnName extends HookableFnName<Client> = never,
>(
  client: Client,
  options?: {
    queryFns?: readonly UseQueryFnName[];
    mutationFns?: readonly UseMutationFnName[];
  },
): WithQueryHooks<Client, UseQueryFnName, UseMutationFnName> {
  const queryFnNames = options?.queryFns ?? DEFAULT_QUERY_FN_NAMES;
  const mutationFnNames = options?.mutationFns ?? DEFAULT_MUTATION_FN_NAMES;

  // set up all the `useQuery` functions
  queryFnNames
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

        // we allow only single-argument functions. If multiple arguments are
        // provided, we will just pass the first one.
        const useClientQuery = (
          clientFnParams: ClientFnFirstParameter<Client, UseQueryFnName>,
          useQueryOptions?: Omit<UseQueryOptions, "queryFn" | "queryKey">,
        ) => {
          return useQuery({
            queryFn: async () => {
              const result = await boundClientFunction(clientFnParams);
              return result;
            },
            queryKey: makeQueryKey(
              client,
              queryFnName as UseQueryFnName,
              clientFnParams,
            ),
            ...useQueryOptions,
          });
        };

        // @ts-expect-error This is safe
        client[prefix("use", capitalize(queryFnName))] = useClientQuery;
      }
    });

  // set up all the `useMutation` functions
  mutationFnNames
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

        const useClientMutation = (
          useMutationOptions?: Omit<
            UseMutationOptions<
              ClientFnReturnType<Client, UseMutationFnName>,
              DefaultError,
              ClientFnFirstParameter<Client, UseMutationFnName>,
              unknown
            >,
            "mutationFn"
          >,
        ) => {
          return useMutation({
            // we allow only single-argument functions. If multiple arguments
            // are provided, we will just pass the first one.
            mutationFn: async (
              params: ClientFnFirstParameter<Client, UseMutationFnName>,
            ): Promise<ClientFnReturnType<Client, UseMutationFnName>> => {
              const result = await boundClientFunction(params);
              return result;
            },

            // Default to invalidating the `getAll` query for this client
            // if there is one
            queryToInvalidate:
              clientHasGetAllFn(client) ?
                makeQueryKey(
                  client,
                  "getAll" as UseQueryFnName,
                  undefined as ClientFnFirstParameter<Client, UseQueryFnName>,
                )
              : undefined,
            ...useMutationOptions,
          });
        };

        // @ts-expect-error This is safe
        client[prefix("use", capitalize(mutationFnName))] = useClientMutation;
      }
    });

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
function makeQueryKey<Client extends ClientObject, FnName extends keyof Client>(
  client: Client,
  queryFnName: FnName,
  params: ClientFnFirstParameter<Client, FnName>,
): QueryKey {
  // exclude any functions from the params, they aren't good to include
  // in a query key
  const newParams = deepExclude(params, isFunction);
  return [client.getModelName(), queryFnName, newParams];
}

function clientHasGetAllFn(client: ClientObject): boolean {
  return "getAll" in client && typeof client.getAll === "function";
}
