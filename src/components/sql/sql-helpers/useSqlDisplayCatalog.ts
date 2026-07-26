import { where } from "@utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { buildSqlDisplayCatalog } from "@/components/sql/sql-helpers/buildSqlDisplayCatalog/buildSqlDisplayCatalog";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";

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
