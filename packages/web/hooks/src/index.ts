export { useBoolean } from "@hooks/useBoolean/useBoolean";
export { useToggleBoolean } from "@hooks/useToggleBoolean/useToggleBoolean";

// use query
export { useQuery } from "@hooks/useQuery/useQuery";
export type {
  UseQueryResult,
  UseQueryOptions,
  UseQueryResultTuple,
} from "@hooks/useQuery/useQuery";
export { DEFAULT_QUERY_FN_NAMES } from "@hooks/withQueryHooks/withQueryHooks.types";
export type {
  DefaultQueryFnName,
  DefaultMutationFnName,
} from "@hooks/withQueryHooks/withQueryHooks.types";

// use mutation
export { useMutation } from "@hooks/useMutation/useMutation";
export type {
  UseMutationResult,
  UseMutateFunction,
  UseMutationOptions,
  UseMutationResultTuple,
} from "@hooks/useMutation/useMutation";
export { DEFAULT_MUTATION_FN_NAMES } from "@hooks/withQueryHooks/withQueryHooks.types";

// client augmenters
export { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";
export type {
  WithQueryHooks,
  FnNameReturningPromise,
} from "@hooks/withQueryHooks/withQueryHooks.types";

// other core types we are forwarding from the tanstack react-query package
export type { DefaultError, QueryClient, QueryKey } from "@hooks/core.types";
