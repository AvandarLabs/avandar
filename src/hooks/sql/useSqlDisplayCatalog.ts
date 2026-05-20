import { buildSqlDisplayCatalog } from "@/lib/sql/buildSqlDisplayCatalog.ts";
import { where } from "@utils";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types.ts";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/**
 * Workspace dataset + column catalog for SQL display pills and `@` mentions.
 */
export function useSqlDisplayCatalog(): {
  catalog: SqlDisplayCatalog;
  isReady: boolean;
} {
  const workspace = useCurrentWorkspace();
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [allColumns] = DatasetColumnClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const isReady = datasets !== undefined && allColumns !== undefined;

  const catalog = useMemo(() => {
    return buildSqlDisplayCatalog({
      datasets: (datasets ?? []).map((d) => {
        return { id: d.id, name: d.name };
      }),
      columns: (allColumns ?? []).map((c) => {
        return { datasetId: c.datasetId, name: c.name };
      }),
    });
  }, [datasets, allColumns]);

  return { catalog, isReady };
}
