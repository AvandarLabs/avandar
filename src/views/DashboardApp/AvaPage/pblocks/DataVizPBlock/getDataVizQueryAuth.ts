import { match } from "ts-pattern";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { AvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
/** Preserves the owning dashboard authentication and snapshot revision. */
export function getDataVizQueryAuth(
  metadata: Readonly<AvaPageMetadata>,
): StructuredQueryAuth {
  return match(metadata)
    .with({ auth: "workspace" }, ({ workspaceId }) => {
      return { auth: "workspace" as const, workspaceId };
    })
    .with({ auth: "public" }, ({ dashboardId, snapshotRevision }) => {
      return {
        auth: "public" as const,
        publicAvaPageId: dashboardId,
        snapshotRevision,
      };
    })
    .with(
      { auth: "workspace_published" },
      ({ dashboardId, snapshotRevision }) => {
        return {
          auth: "workspace_published" as const,
          publicAvaPageId: dashboardId,
          snapshotRevision,
        };
      },
    )
    .exhaustive();
}
