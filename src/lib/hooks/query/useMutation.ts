import { notifications } from "@mantine/notifications";
import {
  DefaultError,
  QueryKey,
  UseMutateFunction as TanstackUseMutateFunction,
  useMutation as tanstackUseMutation,
  UseMutationOptions as TanstackUseMutationOptions,
  UseMutationResult as TanstackUseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { Logger } from "@/lib/Logger";

export type UseMutationResult<
  TData = unknown,
  TError = DefaultError,
  TFnVariables = unknown,
  TContext = unknown,
> = TanstackUseMutationResult<TData, TError, TFnVariables, TContext>;

export type UseMutateFunction<
  TData = unknown,
  TError = DefaultError,
  TFnVariables = void,
  TContext = unknown,
> = TanstackUseMutateFunction<TData, TError, TFnVariables, TContext>;

export type UseMutationOptions<
  TData = unknown,
  TError = DefaultError,
  TFnVariables = void,
  TContext = unknown,
> = TanstackUseMutationOptions<TData, TError, TFnVariables, TContext> & {
  queryToInvalidate?: QueryKey;

  /**
   * If this is set, it takes precedence over the singular
   * `queryToInvalidate`
   */
  queriesToInvalidate?: readonly QueryKey[];
};

export type UseMutationResultTuple<
  TData = unknown,
  TError = DefaultError,
  TFnVariables = void,
  TContext = unknown,
> = [
  doMutationFn: UseMutateFunction<TData, TError, TFnVariables, TContext>,
  isMutatePending: boolean,
  useMutateResultObj: UseMutationResult<TData, TError, TFnVariables, TContext>,
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
  TError = DefaultError,
  TFnVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TFnVariables, TContext>,
): UseMutationResultTuple<TData, TError, TFnVariables, TContext> {
  const queryClient = useQueryClient();
  const mutationObj = tanstackUseMutation(
    {
      ...options,
      onSuccess: () => {
        const { queriesToInvalidate, queryToInvalidate } = options;
        if (queriesToInvalidate) {
          queriesToInvalidate.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        } else if (queryToInvalidate) {
          queryClient.invalidateQueries({ queryKey: queryToInvalidate });
        }
      },
      onError: (error, variables, context) => {
        // TODO(pablo): create an AvandarError class that is able to
        // reformat the most common types of errors we can catch into
        // a common unified format. Such as handling ZodErrors.
        // Catch the error so we can handle and log it better
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error encountered";
        const logData = {
          context,
          variables,
        };

        if (import.meta.env.DEV) {
          notifications.show({
            title: "Error!",
            message: errorMessage,
            color: "danger",
          });
        }

        Logger.error(error, logData);
      },
    },
    queryClient,
  );
  return [mutationObj.mutate, mutationObj.isPending, mutationObj];
}
