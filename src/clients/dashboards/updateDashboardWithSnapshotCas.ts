import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/**
 * Conditionally updates a dashboard whose snapshot pointer and row version
 * still match the caller's read.
 */
export async function updateDashboardWithSnapshotCas(
  options: Readonly<{
    dbClient: AvaSupabaseDBClient;
    dashboard: Pick<
      Dashboard.T,
      | "id"
      | "snapshotRevision"
      | "snapshotTransitionKind"
      | "snapshotTransitionRevision"
      | "updatedAt"
    >;
    dbUpdate: Dashboard.T<"DBUpdate">;
  }>,
): Promise<Dashboard.T<"DBRead"> | undefined> {
  const { dashboard, dbClient, dbUpdate } = options;
  let updateQuery = dbClient
    .from("dashboards")
    .update(dbUpdate)
    .eq("id", dashboard.id)
    .eq("updated_at", dashboard.updatedAt);

  updateQuery =
    dashboard.snapshotRevision === undefined ?
      updateQuery.is("snapshot_revision", null)
    : updateQuery.eq("snapshot_revision", dashboard.snapshotRevision);

  updateQuery =
    dashboard.snapshotTransitionKind === undefined ?
      updateQuery.is("snapshot_transition_kind", null)
    : updateQuery.eq(
        "snapshot_transition_kind",
        dashboard.snapshotTransitionKind,
      );

  updateQuery =
    dashboard.snapshotTransitionRevision === undefined ?
      updateQuery.is("snapshot_transition_revision", null)
    : updateQuery.eq(
        "snapshot_transition_revision",
        dashboard.snapshotTransitionRevision,
      );

  const { data } = await updateQuery.select("*").limit(1).throwOnError();
  return data.at(0);
}
