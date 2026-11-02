import { match } from "ts-pattern";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";
import type { AvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
/**
 * Builds the `StructuredQueryAuth` for a query a dashboard block runs, from
 * the page's metadata: the workspace ID on a workspace page, or the dashboard
 * ID and snapshot revision on a public or published page. Use it wherever a
 * block runs SQL, for example to fetch a chart's rows.
 */
export function makeQueryAuthFromAvaPageMetadata(
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
