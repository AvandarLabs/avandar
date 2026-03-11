// use query
export { useQuery } from "./useQuery/useQuery";
export type {
  UseQueryResult,
  UseQueryOptions,
  UseQueryResultTuple,
} from "./useQuery/useQuery";
export { DEFAULT_QUERY_FN_NAMES } from "./withQueryHooks/withQueryHooks.types";
export type {
  DefaultQueryFnName,
  DefaultMutationFnName,
} from "./withQueryHooks/withQueryHooks.types";

// use mutation
export { useMutation } from "./useMutation/useMutation";
export type {
  UseMutationResult,
  UseMutateFunction,
  UseMutationOptions,
  UseMutationResultTuple,
} from "./useMutation/useMutation";
export { DEFAULT_MUTATION_FN_NAMES } from "./withQueryHooks/withQueryHooks.types";

// client augmenters
export { withQueryHooks } from "./withQueryHooks/withQueryHooks";
export type {
  WithQueryHooks,
  FnNameReturningPromise,
} from "./withQueryHooks/withQueryHooks.types";

// other core types we are forwarding from the tanstack react-query package
export type { DefaultError, QueryClient, QueryKey } from "./core.types";
