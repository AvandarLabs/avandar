import { notifications } from "@mantine/notifications";
import {
  DefaultError,
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
  useQuery as tanstackUseQuery,
  UseQueryOptions as TanstackUseQueryOptions,
  UseQueryResult as TanstackUseQueryResult,
} from "@tanstack/react-query";
import { Merge } from "type-fest";
import { Logger } from "@/lib/Logger";

export type UseQueryResult<TData> = TanstackUseQueryResult<TData, DefaultError>;
export type UseQueryOptions<
  TQueryFnData = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Merge<
  TanstackUseQueryOptions<TQueryFnData, DefaultError, TData, TQueryKey>,
  {
    queryFn: QueryFunction<TQueryFnData, TQueryKey>;

    /**
     * When set, the previous data will be used as the placeholder data.
     * So if the query is being re-fetched, the previous data will be returned
     * until the query finishes, rather than returning `undefined`.
     *
     * This is the equivalent of passing the useQuery option:
     *
     * ```ts
     * placeholderData: (prevValue) => prevValue;
     * ```
     */
    usePreviousDataAsPlaceholder?: boolean;
  }
>;

/**
 * A tuple containing [data, `isLoading` state, the query result object].
 */
export type UseQueryResultTuple<
  TQueryFnData = unknown,
  TData = TQueryFnData,
> = [
  data: undefined | TData,
  isLoading: boolean,
  queryResult: TanstackUseQueryResult<TData, DefaultError>,
];

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
): UseQueryResultTuple<TQueryFnData, TData> {
  const { queryFn, ...queryOptions } = options;
  const queryResult = tanstackUseQuery({
    ...queryOptions,
    queryFn: async (context: QueryFunctionContext<TQueryKey>) => {
      try {
        const results = await queryFn(context);
        return results;
      } catch (error) {
        // TODO(jpsyx): create an AvandarError class that is able to
        // reformat the most common types of errors we can catch into
        // a common unified format. Such as handling ZodErrors.

        // Catch the error so we can handle and log it better
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
    placeholderData:
      options.usePreviousDataAsPlaceholder ?
        (prevValue) => {
          return prevValue;
        }
      : undefined,
  });

  return [
    queryResult.data,
    queryResult.isLoading,
    queryResult,
  ] as UseQueryResultTuple<TQueryFnData, TData>;
}
