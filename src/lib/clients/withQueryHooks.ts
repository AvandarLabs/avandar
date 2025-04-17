import { useQuery, UseQueryResultTuple } from "@/lib/hooks/query/useQuery";
import { capitalize, prefix } from "@/lib/utils/strings";
import { AnyFunction, KeysThatMapTo } from "../types/utilityTypes";
import { castToAny } from "../utils/functions";
import { ModelCRUDTypes } from "../utils/models/ModelCRUDTypes";
import { ICRUDModelClient } from "./ICRUDModelClient";

type WithQueryHooks<
  M extends ModelCRUDTypes,
  Client extends ICRUDModelClient<M>,
  QueryFnNames extends Extract<keyof Client, string>,
> = Client & {
  [FnName in QueryFnNames as `use${Capitalize<FnName>}`]: Client[FnName] extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => Promise<infer Result>
  ) ?
    (...args: Parameters<Client[FnName]>) => UseQueryResultTuple<Result>
  : never;
};

function getAllCustomMethods(obj: object): Array<keyof typeof obj> {
  const methods: Array<keyof typeof obj> = [];
  let currentObj = obj;

  // Walk up the prototype chain until we reach Object.prototype or
  // a built-in class. We are only trying to collect user-defined method names
  while (
    currentObj &&
    currentObj !== Object.prototype &&
    // Check if this is a custom class (not built-in)
    !currentObj.constructor.toString().includes("[native code]")
  ) {
    const props = Object.getOwnPropertyNames(currentObj);

    // Filter for functions/methods
    for (const prop of props) {
      // Skip constructor and special methods
      if (prop !== "constructor" && !prop.startsWith("__")) {
        if (
          typeof (currentObj as Record<string, unknown>)[prop] === "function"
        ) {
          methods.push(prop as keyof typeof currentObj);
        }
      }
    }

    currentObj = Object.getPrototypeOf(currentObj);
  }

  return methods;
}

/**
 * Augments a CRUD Model Client instance with `use` hooks that call
 * `useQuery` and return the appropriate type according to which
 * function names are passed.
 *
 * @param client The client to add query hooks to.
 * @param usableQueryFns The query functions to add hooks for. If
 * this argument is not provided, we add hooks for all functions.
 * @returns The client with query hooks added.
 */
export function withQueryHooks<
  M extends ModelCRUDTypes,
  CRUDClient extends ICRUDModelClient<M>,
  UsableQueryFnNames extends Extract<keyof CRUDClient, string> = Extract<
    KeysThatMapTo<AnyFunction, CRUDClient>,
    string
  >,
>(
  client: CRUDClient,
  usableQueryFns?: readonly UsableQueryFnNames[],
): WithQueryHooks<M, CRUDClient, UsableQueryFnNames> {
  const queryFnNames = usableQueryFns ?? getAllCustomMethods(client);
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
              return await boundClientFunction(...args);
            },
          });
        };

        // @ts-expect-error Valid error to raise but it's safe.
        client[prefix("use", capitalize(queryFnName))] = useClientFunction;
      }
    });

  return castToAny(client);
}
