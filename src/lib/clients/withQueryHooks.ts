import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { capitalize, prefix } from "@/lib/utils/strings";
import { AnyFunctionWithReturn, KeysThatMapTo } from "../types/utilityTypes";
import { castToAny } from "../utils/functions";
import { ICRUDModelClient } from "./ICRUDModelClient";

/**
 * Augments a CRUD Model Client instance with `use` hooks that call
 * `useQuery` and return the appropriate type according to which
 * function names are passed. We only convert functions that return
 * a Promise to a `use` hook.
 */
type WithQueryHooks<
  CRUDClient extends ICRUDModelClient,
  QueryFnNames extends Extract<keyof CRUDClient, string>,
> = CRUDClient & {
  [FnName in QueryFnNames as `use${Capitalize<FnName>}`]: CRUDClient[FnName] extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => Promise<infer Result> | infer Result
  ) ?
    (...args: Parameters<CRUDClient[FnName]>) => UseQueryResultTuple<Result>
  : never;
};

/**
 * A union of all function names that return a Promise from a CRUD client.
 */
type UsableQueryFnName<CRUDClient extends ICRUDModelClient> = Extract<
  KeysThatMapTo<AnyFunctionWithReturn<Promise<unknown>>, CRUDClient>,
  string
>;

/**
 * A default list of functions to turn into `use` hooks in a CRUD client.
 */
const DEFAULT_USEABLE_FN_NAMES: ReadonlyArray<
  UsableQueryFnName<ICRUDModelClient>
> = ["getById", "getAll", "insert", "update", "delete"] as const;

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
  CRUDClient extends ICRUDModelClient,
  UseableFnName extends UsableQueryFnName<CRUDClient>,
>(
  client: CRUDClient,
  usableQueryFns?: readonly UseableFnName[],
): WithQueryHooks<CRUDClient, UseableFnName> {
  const queryFnNames: readonly UseableFnName[] =
    usableQueryFns ?? (DEFAULT_USEABLE_FN_NAMES as readonly UseableFnName[]);

  queryFnNames
    .filter((queryFnName) => {
      return typeof client[queryFnName] === "function";
    })
    .forEach((queryFnName) => {
      const clientFunction = client[queryFnName];
      if (typeof clientFunction === "function") {
        const boundClientFunction = clientFunction.bind(client);

        const useClientFunction = (...args: unknown[]) => {
          return useQuery({
            queryKey: [client.modelName, queryFnName, ...args],
            queryFn: async () => {
              const result = await boundClientFunction(...args);
              return result;
            },
          });
        };

        // @ts-expect-error Valid error to raise but it's safe.
        client[prefix("use", capitalize(queryFnName))] = useClientFunction;
      }
    });

  return castToAny(client);
}
