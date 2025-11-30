import {
  DefaultError,
  QueryKey,
  UseMutateAsyncFunction as TanstackUseMutateAsyncFunction,
  UseMutateFunction as TanstackUseMutateFunction,
  useMutation as tanstackUseMutation,
  UseMutationOptions as TanstackUseMutationOptions,
  UseMutationResult as TanstackUseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { Logger } from "$/lib/Logger/Logger";
import { Simplify } from "type-fest";
import { notifyError } from "@/lib/ui/notifications/notify";

export type UseMutationResult<
  TData = unknown,
  TFnVariables = unknown,
  TError = DefaultError,
  TContext = unknown,
> = TanstackUseMutationResult<TData, TError, TFnVariables, TContext>;

export type UseMutateFunction<
  TData = unknown,
  TFnVariables = void,
  TError = DefaultError,
  TContext = unknown,
> = TanstackUseMutateFunction<TData, TError, TFnVariables, TContext> & {
  async: TanstackUseMutateAsyncFunction<TData, TError, TFnVariables, TContext>;
};

export type UseMutationOptions<
  TData = unknown,
  TFnVariables = void,
  TError = DefaultError,
  TContext = unknown,
> = TanstackUseMutationOptions<TData, TError, TFnVariables, TContext> & {
  /**
   * Invalidate the specified query after the mutation is successful.
   */
  queryToInvalidate?: QueryKey;

  /**
   * Invalidate the specified queries after the mutation is successful.
   * If this is set, it takes precedence over the singular `queryToInvalidate`
   */
  queriesToInvalidate?: readonly QueryKey[];

  /**
   * Refetch the specified query after the mutation is successful.
   */
  queryToRefetch?: QueryKey;

  /**
   * Refetch the specified queries after the mutation is successful.
   * If this is set, it takes precedence over the singular `queryToRefetch`
   */
  queriesToRefetch?: readonly QueryKey[];
};

export type UseMutationResultTuple<
  TData = unknown,
  TFnVariables = void,
  TError = DefaultError,
  TContext = unknown,
> = [
  doMutationFn: UseMutateFunction<TData, TFnVariables, TError, TContext>,
  isMutatePending: boolean,
  useMutateResultObj: UseMutationResult<TData, TFnVariables, TError, TContext>,
];

/**
 * A wrapper around Tanstack's useMutation that provides a more convenient
 * tuple of [doMutationFn, isMutatePending, useMutateResultObj] as the
 * return value.
 * @param options - The options for the mutation. These are the same as
 * Tanstack's useMutation options.
 * @returns A `useMutation` result object.
 */
export function useMutation<
  TData = unknown,
  TFnVariables = void,
  TError = DefaultError,
  TContext = unknown,
>(
  options: Simplify<UseMutationOptions<TData, TFnVariables, TError, TContext>>,
): UseMutationResultTuple<TData, TFnVariables, TError, TContext> {
  const queryClient = useQueryClient();
  const mutationObj = tanstackUseMutation(
    {
      ...options,
      onSuccess: async (data, variables, onMutateResult, context) => {
        const {
          queriesToInvalidate,
          queryToInvalidate,
          queriesToRefetch,
          queryToRefetch,
        } = options;
        if (queriesToInvalidate) {
          queriesToInvalidate.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        } else if (queryToInvalidate) {
          queryClient.invalidateQueries({ queryKey: queryToInvalidate });
        }

        if (queriesToRefetch) {
          queriesToRefetch.forEach((queryKey) => {
            queryClient.refetchQueries({ queryKey });
          });
        } else if (queryToRefetch) {
          queryClient.refetchQueries({ queryKey: queryToRefetch });
        }

        // Now call the user-defined `onSuccess`
        options.onSuccess?.(data, variables, onMutateResult, context);
      },
      onError: (error, variables, onMutateResult, context) => {
        // TODO(jpsyx): create an AvandarError class that is able to
        // reformat the most common types of errors we can catch into
        // a common unified format. Such as handling ZodErrors.
        // Catch the error so we can handle and log it better
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error encountered";
        const logData = {
          context,
          onMutateResult,
          variables,
        };

        // if there is a user-defined `onError` function, call it
        if (options.onError) {
          options.onError(error, variables, onMutateResult, context);
        } else {
          if (import.meta.env.DEV) {
            notifyError({ title: "Error!", message: errorMessage });
          } else {
            notifyError({
              title: "An unexpected error occurred",
              message: "Please contact support for assistance.",
            });
          }
          Logger.error(error, logData);
        }
      },
    },
    queryClient,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mutationObj.mutate as any).async = mutationObj.mutateAsync;

  return [
    mutationObj.mutate as UseMutateFunction<
      TData,
      TFnVariables,
      TError,
      TContext
    >,
    mutationObj.isPending,
    mutationObj,
  ];
}
