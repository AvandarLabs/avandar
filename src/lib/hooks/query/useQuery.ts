import { notifications } from "@mantine/notifications";
import {
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
  useQuery as tanstackUseQuery,
  UseQueryOptions as TanstackUseQueryOptions,
  UseQueryResult as TanstackUseQueryResult,
} from "@tanstack/react-query";
import { Replace } from "@/lib/types/utilityTypes";
import { Logger } from "@/lib/utils/Logger";

export type UseQueryResult<TData> = TanstackUseQueryResult<TData, Error>;
export type UseQueryOptions<
  TQueryFnData = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Replace<
  TanstackUseQueryOptions<TQueryFnData, Error, TData, TQueryKey>,
  {
    queryFn: QueryFunction<TQueryFnData, TQueryKey>;
  }
>;

/**
 * A wrapper around Tanstack's useQuery that provides additional error handling.
 * @param options - The options for the query. These are the same as Tanstack's
 * useQuery options.
 * @returns A `useQuery` result object.
 */
export function useQuery<
  TQueryFnData = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TData, TQueryKey>,
): UseQueryResult<TData> {
  const { queryFn, ...queryOptions } = options;
  return tanstackUseQuery({
    ...queryOptions,
    queryFn: async (context: QueryFunctionContext<TQueryKey>) => {
      try {
        const results = await queryFn(context);
        return results;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error encountered";
        const logData = {
          context,
          queryKey: queryOptions.queryKey,
        };

        if (import.meta.env.DEV) {
          // only show a frontend notification about this if we're in dev mode
          notifications.show({
            title: "Error!",
            message: errorMessage,
            color: "danger",
          });
        }

        Logger.error(error, logData);
        throw error;
      }
    },
  });
}
