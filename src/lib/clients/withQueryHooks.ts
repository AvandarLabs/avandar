import { QueryKey } from "@tanstack/react-query";
import {
  useMutation,
  UseMutationResultTuple,
} from "@/lib/hooks/query/useMutation";
import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { capitalize, prefix } from "@/lib/utils/strings";
import {
  AnyFunction,
  AnyFunctionWithReturn,
  KeysThatMapTo,
} from "../types/utilityTypes";
import { castToAny } from "../utils/functions";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";
import { ModelCRUDClient } from "./CRUDModelClient";

/**
 * A union of all function names that return a Promise from an object
 */
type FnNameReturningPromise<T extends object> = Extract<
  KeysThatMapTo<AnyFunctionWithReturn<Promise<unknown>>, T>,
  string
>;

/**
 * A default list of query functions to turn into `use` hooks in a CRUD client.
 * They will wrap `useQuery`.
 */
const DEFAULT_QUERY_FN_NAMES = [
  "getById",
  "getAll",
] as const satisfies ReadonlyArray<
  FnNameReturningPromise<ModelCRUDClient<ModelCRUDTypes>>
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
  FnNameReturningPromise<ModelCRUDClient<ModelCRUDTypes>>
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
  [FnName in Extract<
    QueryFnName | MutationFnName,
    string
  > as `use${Capitalize<FnName>}`]: CRUDClient[FnName] extends (
    AnyFunctionWithReturn<Promise<infer Result> | infer Result>
  ) ?
    (
      ...args: Parameters<CRUDClient[FnName]>
    ) => FnName extends QueryFnName ? UseQueryResultTuple<Result>
    : UseMutationResultTuple<Result>
  : never;
};

// TODO(pablo): Add mutation hook types to WithQueryHooks
/**
 * Augments a CRUD Model Client instance with `use` hooks that call
 * `useQuery` and return the appropriate type according to which
 * function names are passed.
 *
 * @param client The client to add query hooks to.
 * @param usableQueryFns The query functions to add hooks for. If
 * this argument is not provided, we add hooks for the function names
 * specified in `DEFAULT_USEABLE_FN_NAMES`.
 * @returns The client with query hooks added.
 */
export function withQueryHooks<
  CRUDClient extends ModelCRUDClient<ModelCRUDTypes>,
  UseQueryFnName extends FnNameReturningPromise<CRUDClient> = never,
  UseMutationFnName extends FnNameReturningPromise<CRUDClient> = never,
>(
  client: CRUDClient,
  options?: {
    usableQueryFns?: readonly UseQueryFnName[];
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
  const queryFnNames = options?.usableQueryFns ?? DEFAULT_QUERY_FN_NAMES;
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

        const useClientFnQuery = (
          ...args: CRUDClient[UseQueryFnName] extends AnyFunction ?
            Parameters<CRUDClient[UseQueryFnName]>
          : []
        ) => {
          return useQuery({
            queryFn: async () => {
              const result = await boundClientFunction(...args);
              return result;
            },
            queryKey: makeQueryKey(
              client,
              queryFnName as UseQueryFnName,
              ...args,
            ),
          });
        };

        // @ts-expect-error Valid error to raise but it's safe.
        client[prefix("use", capitalize(queryFnName))] = useClientFnQuery;
      }
    });

  mutationFnNames
    .filter((mutationFnName) => {
      return typeof client[mutationFnName] === "function";
    })
    .forEach((mutationFnName) => {
      const clientFunction = client[mutationFnName];
      if (typeof clientFunction === "function") {
        const boundClientFunction = clientFunction.bind(client);

        const useClientFnMutation = (
          ...args: CRUDClient[UseMutationFnName] extends AnyFunction ?
            Parameters<CRUDClient[UseMutationFnName]>
          : []
        ) => {
          return useMutation({
            mutationFn: async () => {
              const result = await boundClientFunction(...args);
              return result;
            },
            queryToInvalidate: makeQueryKey(
              client,
              mutationFnName as UseMutationFnName,
              ...args,
            ),
          });
        };

        // @ts-expect-error Valid error to raise but it's safe.
        client[prefix("use", capitalize(mutationFnName))] = useClientFnMutation;
      }
    });

  return castToAny(client);
}

function makeQueryKey<
  CRUDClient extends ModelCRUDClient<ModelCRUDTypes>,
  FnName extends FnNameReturningPromise<CRUDClient>,
>(
  client: CRUDClient,
  queryFnName: FnName,
  ...args: CRUDClient[FnName] extends AnyFunction ?
    Parameters<CRUDClient[FnName]>
  : []
): QueryKey {
  return [client.modelName, queryFnName, ...args];
}
