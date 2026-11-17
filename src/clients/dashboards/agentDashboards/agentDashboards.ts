import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { DashboardParsers } from "$/models/Dashboard/DashboardParsers";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { countDashboardTiles } from "@/clients/dashboards/findDashboardTile/findDashboardTile";
import { updateDashboardRowIfUnchanged } from "@/clients/dashboards/updateDashboardRowIfUnchanged";
import { UserClient } from "@/clients/UserClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock/buildPendingDashboardBlock";
import { DashboardColumnBindingPreparation } from "@/views/DashboardApp/AvaPage/utils/DashboardColumnBindingPreparation/DashboardColumnBindingPreparation";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { AgentDashboardCandidate } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

/** How saving a block to a dashboard ended. */
export type AppendDashboardBlockResult =
  | { kind: "saved" }
  /** Another save changed the row twice in a row. Retrying may work. */
  | { kind: "stale" }
  /** The dashboard is gone, or the user can no longer edit it. */
  | { kind: "unavailable" }
  /** The request failed, most often for want of a connection. */
  | { kind: "failed" };

/**
 * Every dashboard in the workspace, as candidates for the agent's name
 * match: id, name, chart count, and last save. The workspace filter is
 * load-bearing: without it, the select policy also returns public
 * dashboards of other workspaces.
 */
export async function loadWorkspaceDashboardCandidates(
  workspaceId: string,
): Promise<AgentDashboardCandidate[]> {
  const dashboards = await DashboardClient.getAll({
    where: { workspace_id: { eq: workspaceId } },
  });
  return dashboards.map((dashboard) => {
    return {
      id: dashboard.id,
      name: dashboard.name,
      chartCount: countDashboardTiles(dashboard.config),
      updatedAt: dashboard.updatedAt,
    };
  });
}

/** Whether the current user may edit the dashboard. */
export function canEditDashboard(dashboardId: string): Promise<boolean> {
  return UserClient.canAccessResource({
    resourceType: "dashboard",
    resourceId: dashboardId,
    minRole: "editor",
  });
}

/** The dashboard's content with the block appended and bindings prepared. */
async function _appendedConfig(
  dashboard: Dashboard.T,
  block: ChatGeneratedDashboardBlock,
  workspaceId: Workspace.Id,
): Promise<Dashboard.T["config"]> {
  const data = upgradeAvaPageData(
    dashboard.config as unknown as AvaPageGenericData,
  );
  const appended = {
    ...data,
    content: [...(data.content ?? []), buildPendingDashboardBlock(block)],
  };
  const prepared = await DashboardColumnBindingPreparation.prepareDocument({
    data: appended,
    auth: { auth: "workspace", workspaceId },
    queryClient: AvaQueryClient,
  });
  return prepared as unknown as Dashboard.T["config"];
}

/** One read, append, and save. Undefined when the row changed meanwhile. */
async function _trySave(
  options: Readonly<{
    workspaceId: Workspace.Id;
    dashboardId: string;
    block: ChatGeneratedDashboardBlock;
  }>,
): Promise<AppendDashboardBlockResult | undefined> {
  const dashboard = await DashboardClient.getById({
    id: options.dashboardId as Dashboard.Id,
  });
  if (!dashboard) {
    return { kind: "unavailable" };
  }
  const config = await _appendedConfig(
    dashboard,
    options.block,
    options.workspaceId,
  );
  const updated = await updateDashboardRowIfUnchanged({
    dbClient: AvaSupabase.db(),
    dashboard,
    dbUpdate: DashboardParsers.fromModelUpdateToDBUpdate({ config }),
  });
  return updated ? { kind: "saved" } : undefined;
}

/**
 * Appends one block to a dashboard's stored content, prepares column
 * bindings as the editor's Save does, and saves only if nobody changed the
 * row since it was read, reading again and retrying once. The published
 * snapshot is never touched.
 */
export async function appendBlockToDashboard(
  options: Readonly<{
    workspaceId: Workspace.Id;
    dashboardId: string;
    block: ChatGeneratedDashboardBlock;
  }>,
): Promise<AppendDashboardBlockResult> {
  try {
    if (!(await canEditDashboard(options.dashboardId))) {
      return { kind: "unavailable" };
    }
    const result = (await _trySave(options)) ?? (await _trySave(options));
    if (result?.kind === "saved") {
      void AvaQueryClient.invalidateQueries({
        queryKey: DashboardClient.QueryKeys.getAll(),
      });
      void AvaQueryClient.invalidateQueries({
        queryKey: DashboardClient.QueryKeys.getById({
          id: options.dashboardId as Dashboard.Id,
        }),
      });
    }
    return result ?? { kind: "stale" };
  } catch {
    return { kind: "failed" };
  }
}
