import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { refreshDataVizColumnBindings } from "./useDataVizColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

type Options = {
  id: string;
  rawSql: string;
  auth: StructuredQueryAuth;
  expectedSql: string | undefined;
  result: (QueryResult.T & { executedSql: string | undefined }) | undefined;
  isSuccess: boolean;
};

/** Publishes the current query observer's completed metadata to its block. */
export function useRefreshDataVizColumnBindings(
  options: Readonly<Options>,
): void {
  const queryClient = useQueryClient();
  const { id, rawSql, auth, expectedSql, result, isSuccess } = options;
  useEffect(
    function refreshCompletedMetadata() {
      if (isSuccess && result && expectedSql !== undefined) {
        refreshDataVizColumnBindings(
          {
            scopeKey: id,
            rawSql,
            auth,
            projections: [],
            initialRegistry: undefined,
          },
          queryClient,
          result,
          expectedSql,
        );
      }
    },
    [queryClient, id, rawSql, auth, expectedSql, result, isSuccess],
  );
}
