import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { DataVizColumnBindings } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizColumnBindings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { QueryMetadataProvenance } from "@/clients/queries/createQueryMetadataProvenance";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

/**
 * Updates a chart's entry in the `DataVizColumnBindings` cache after the
 * chart's query succeeds, so the cached column IDs follow the `QueryResult`
 * columns that query returned. Use it beside a query that runs a chart's
 * SQL, for example the query that fetches a dashboard chart's rows.
 */
export function useRefreshDataVizColumnBindings(
  options: Readonly<{
    id: string;
    rawSql: string;
    auth: StructuredQueryAuth;
    expectedSql: string | undefined;
    result:
      | (QueryResult.T & {
          executedSql: string | undefined;
          metadataProvenance?: QueryMetadataProvenance;
        })
      | undefined;
    isSuccess: boolean;
  }>,
): void {
  const queryClient = useQueryClient();
  const { id, rawSql, auth, expectedSql, result, isSuccess } = options;
  useEffect(
    function refreshCompletedMetadata() {
      if (isSuccess && result && expectedSql !== undefined) {
        DataVizColumnBindings.refresh({
          options: {
            scopeKey: id,
            rawSql,
            auth,
            projections: [],
            initialRegistry: undefined,
          },
          queryClient: queryClient,
          result: result,
          expectedSql: expectedSql,
        });
      }
    },
    [queryClient, id, rawSql, auth, expectedSql, result, isSuccess],
  );
}
