import { ModelCRUDClient } from "@clients/ModelCRUDClient/ModelCRUDClient.types";
import { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";
import {
  DEFAULT_MUTATION_FN_NAMES,
  DEFAULT_QUERY_FN_NAMES,
  DefaultMutationFnName,
  DefaultQueryFnName,
  FnNameReturningPromise,
  WithQueryHooks,
} from "@hooks/withQueryHooks/withQueryHooks.types";

export function createUsableServiceClient<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Client extends ModelCRUDClient<any>,
  UseQueryFnName extends FnNameReturningPromise<Client>,
  UseMutationFnName extends FnNameReturningPromise<Client>,
>(
  model: Client,
  {
    queryFns = [],
    mutationFns = [],
  }: {
    queryFns?: readonly UseQueryFnName[];
    mutationFns?: readonly UseMutationFnName[];
  } = {},
): WithQueryHooks<
  Client,
  Extract<UseQueryFnName | DefaultQueryFnName, FnNameReturningPromise<Client>>,
  Extract<
    UseMutationFnName | DefaultMutationFnName,
    FnNameReturningPromise<Client>
  >
> {
  return withQueryHooks(model, {
    queryFns: [...DEFAULT_QUERY_FN_NAMES, ...queryFns] as Array<
      Extract<
        UseQueryFnName | DefaultQueryFnName,
        FnNameReturningPromise<Client>
      >
    >,
    mutationFns: [...DEFAULT_MUTATION_FN_NAMES, ...mutationFns] as Array<
      Extract<
        UseMutationFnName | DefaultMutationFnName,
        FnNameReturningPromise<Client>
      >
    >,
  });
}
