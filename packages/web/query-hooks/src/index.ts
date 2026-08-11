// provider
export { AvaQueryProvider } from "@query-hooks/AvaQueryProvider";
export { useAvaQueryErrorReporter } from "@query-hooks/useAvaQueryErrorReporter";
export type { AvaQueryErrorReporter } from "@query-hooks/ErrorReporterContext";

// use query
export { useQuery } from "@query-hooks/useQuery/useQuery";
export type {
  UseQueryResult,
  UseQueryOptions,
  UseQueryResultTuple,
} from "@query-hooks/useQuery/useQuery";
export { DEFAULT_QUERY_FN_NAMES } from "@query-hooks/withQueryHooks/withQueryHooks.types";
export type {
  DefaultQueryFnName,
  DefaultMutationFnName,
} from "@query-hooks/withQueryHooks/withQueryHooks.types";

// use mutation
export { useMutation } from "@query-hooks/useMutation/useMutation";
export type {
  UseMutationResult,
  UseMutateFunction,
  UseMutationOptions,
  UseMutationResultTuple,
} from "@query-hooks/useMutation/useMutation";
export { DEFAULT_MUTATION_FN_NAMES } from "@query-hooks/withQueryHooks/withQueryHooks.types";

// client augmenters
export { withQueryHooks } from "@query-hooks/withQueryHooks/withQueryHooks";
export type {
  WithQueryHooks,
  FnNameReturningPromise,
} from "@query-hooks/withQueryHooks/withQueryHooks.types";

// other core types we are forwarding from the tanstack react-query package
export type {
  DefaultError,
  QueryClient,
  QueryKey,
} from "@query-hooks/core.types";
