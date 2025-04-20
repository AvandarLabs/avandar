import {
  DefaultError,
  QueryKey,
  UseMutationOptions,
} from "@tanstack/react-query";
import {
  useMutation,
  UseMutationResultTuple,
} from "@/lib/hooks/query/useMutation";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { capitalize, prefix } from "@/lib/utils/strings";
import {
  AnyFunction,
  AnyFunctionWithReturn,
  AnyFunctionWithSignature,
  KeysThatMapTo,
} from "../types/utilityTypes";
import { castToAny } from "../utils/functions";
import { isFunction } from "../utils/guards";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";
import { deepExclude } from "../utils/objects";
import { ModelCRUDClient } from "./ModelCRUDClient";

/**
 * A union of all function names that have a *single* argument and
 * return a Promise. These functions are eligible to be wrapped in
 * `useQuery` or `useMutation` hooks.
 */
type HookableFnNames<T extends object> = Extract<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  KeysThatMapTo<AnyFunctionWithSignature<[any], Promise<unknown>>, T>,
  string
>;

/**
 * Get the first parameter of a function's array of parameters.
 */
type ClientFnFirstParameter<
  CRUDClient extends ModelCRUDClient<ModelCRUDTypes>,
  FnName extends keyof CRUDClient,
  Fn extends CRUDClient[FnName] = CRUDClient[FnName],
> =
  Fn extends AnyFunction ?
    undefined extends Parameters<Fn>[0] ?
      void | Parameters<Fn>[0]
    : Parameters<Fn>[0]
  : never;

type ClientFnReturnType<
  CRUDClient extends ModelCRUDClient<ModelCRUDTypes>,
  FnName extends keyof CRUDClient,
> =
  CRUDClient[FnName] extends AnyFunction ? ReturnType<CRUDClient[FnName]>
  : never;

/**
 * A default list of query functions to turn into `use` hooks in a CRUD client.
 * They will wrap `useQuery`.
 */
const DEFAULT_QUERY_FN_NAMES = [
  "getById",
  "getAll",
] as const satisfies ReadonlyArray<
  HookableFnNames<ModelCRUDClient<ModelCRUDTypes>>
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
  HookableFnNames<ModelCRUDClient<ModelCRUDTypes>>
>;

/**
 * Augments a CRUD Model Client instance with `use` hooks that call
 * `useQuery` or `useMutation` and return the appropriate types.
 * We only convert functions that return a Promise to a `use` hook.
 */
type WithQueryHooks<
  CRUDClient extends ModelCRUDClient<ModelCRUDTypes>,
  QueryFnName extends keyof CRUDClient,
  MutationFnName extends keyof CRUDClient,
> = CRUDClient & {
  [QName in Extract<
    QueryFnName,
    string
  > as `use${Capitalize<QName>}`]: CRUDClient[QName] extends (
    AnyFunctionWithReturn<Promise<infer Result>>
  ) ?
    (
      params: ClientFnFirstParameter<CRUDClient, QName>,
    ) => UseQueryResultTuple<Result>
  : never;
} & {
  [MutName in Extract<
    MutationFnName,
    string
  > as `use${Capitalize<MutName>}`]: CRUDClient[MutName] extends (
    AnyFunctionWithSignature<infer Params, Promise<infer Result>>
  ) ?
    (
      useMutationOptions?: Omit<
        UseMutationOptions<Result, DefaultError, Params, unknown>,
        "mutationFn"
      >,
    ) => UseMutationResultTuple<Result, DefaultError, Params, unknown>
  : never;
};

/**
 * Augments a CRUD Model Client instance with `use` hooks that call
 * `useQuery` and return the appropriate type according to which
 * function names are passed.
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
  CRUDClient extends ModelCRUDClient<ModelCRUDTypes>,
  UseQueryFnName extends HookableFnNames<CRUDClient> = never,
  UseMutationFnName extends HookableFnNames<CRUDClient> = never,
>(
  client: CRUDClient,
  options?: {
    queryFns?: readonly UseQueryFnName[];
    mutationFns?: readonly UseMutationFnName[];
  },
): WithQueryHooks<
  CRUDClient,
  [UseQueryFnName] extends [never] ? (typeof DEFAULT_QUERY_FN_NAMES)[number]
  : UseQueryFnName,
  [UseMutationFnName] extends [never] ?
    (typeof DEFAULT_MUTATION_FN_NAMES)[number]
  : UseMutationFnName
> {
  const queryFnNames = options?.queryFns ?? DEFAULT_QUERY_FN_NAMES;
  const mutationFnNames = options?.mutationFns ?? DEFAULT_MUTATION_FN_NAMES;

  // set up all the `useQuery` functions
  queryFnNames
    .filter((queryFnName) => {
      return typeof client[queryFnName] === "function";
    })
    .forEach((queryFnName) => {
      const clientFunction = client[queryFnName as UseQueryFnName];
      if (typeof clientFunction === "function") {
        const boundClientFunction = clientFunction.bind(client);

        // we allow only single-argument functions. If multiple arguments are
        // provided, we will just pass the first one.
        const useClientQuery = (
          params: ClientFnFirstParameter<CRUDClient, UseQueryFnName>,
        ) => {
          return useQuery({
            queryFn: async () => {
              const result = await boundClientFunction(params);
              return result;
            },
            queryKey: makeQueryKey(
              client,
              queryFnName as UseQueryFnName,
              params,
            ),
          });
        };

        // @ts-expect-error Valid error to raise but it's safe.
        client[prefix("use", capitalize(queryFnName))] = useClientQuery;
      }
    });

  // set up all the `useMutation` functions
  mutationFnNames
    .filter((mutationFnName) => {
      return typeof client[mutationFnName] === "function";
    })
    .forEach((mutationFnName) => {
      const clientFunction = client[mutationFnName];
      if (typeof clientFunction === "function") {
        const boundClientFunction = clientFunction.bind(client);

        const useClientMutation = (
          useMutationOptions?: Omit<
            UseMutationOptions<
              ClientFnReturnType<CRUDClient, UseMutationFnName>,
              DefaultError,
              ClientFnFirstParameter<CRUDClient, UseMutationFnName>,
              unknown
            >,
            "mutationFn"
          >,
        ) => {
          return useMutation({
            // we allow only single-argument functions. If multiple arguments
            // are provided, we will just pass the first one.
            mutationFn: async (
              params: ClientFnFirstParameter<CRUDClient, UseMutationFnName>,
            ): Promise<ClientFnReturnType<CRUDClient, UseMutationFnName>> => {
              const result = await boundClientFunction(params);
              return result;
            },

            // Default to invalidating the `getAll` query for this client
            queryToInvalidate: makeQueryKey(
              client,
              "getAll" as const,
              undefined as ClientFnFirstParameter<CRUDClient, "getAll">,
            ),
            ...useMutationOptions,
          });
        };

        // @ts-expect-error Valid error to raise but it's safe.
        client[prefix("use", capitalize(mutationFnName))] = useClientMutation;
      }
    });

  return castToAny(client);
}

/**
 * Creates a query key for a given client, function name, and params.
 * @param client The client to create the query key for.
 * @param queryFnName The name of the query function.
 * @param params The parameters for the query function.
 * @returns The query key.
 */
function makeQueryKey<
  CRUDClient extends ModelCRUDClient<ModelCRUDTypes>,
  FnName extends keyof CRUDClient,
>(
  client: CRUDClient,
  queryFnName: FnName,
  params: ClientFnFirstParameter<CRUDClient, FnName>,
): QueryKey {
  // exclude any functions from the params, they aren't good to include
  // in a query key
  const newParams = deepExclude(params, isFunction);
  return [client.modelName, queryFnName, newParams];
}
