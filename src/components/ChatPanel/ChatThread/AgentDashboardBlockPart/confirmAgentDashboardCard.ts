import { appendBlockToDashboard } from "@/clients/dashboards/agentDashboards/agentDashboards";
import { AgentDashboardCardStore } from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock/buildPendingDashboardBlock";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  AgentDashboardCardIdentity,
  AgentDashboardCardStatus,
} from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import type { AgentDashboardCandidate } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import type { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

const FAILURE_REASONS = {
  stale: "stale",
  failed: "network",
  unavailable: "unavailable",
} as const;

function _confirmedStatus(
  dashboard: AgentDashboardCandidate,
  isUnsaved: boolean,
): AgentDashboardCardStatus {
  return {
    status: "confirmed",
    dashboardId: dashboard.id,
    dashboardName: dashboard.name,
    isUnsaved,
    isReported: false,
  };
}

/**
 * Confirms a dashboard card. When the dashboard is open in the editor right
 * now, the block goes there unsaved, since the editor's next Save would
 * overwrite a row written underneath it. Otherwise the block is saved to
 * the dashboard. The card's status records how it ended.
 */
export async function confirmAgentDashboardCard(
  options: Readonly<{
    card: AgentDashboardBlockData;
    dashboard: AgentDashboardCandidate;
    identity: AgentDashboardCardIdentity;
    editor: {
      activeDashboardId: string | undefined;
      dispatch: Pick<
        ReturnType<typeof DashboardEditorStateManager.useDispatch>,
        "queuePendingBlock"
      >;
    };
  }>,
): Promise<AgentDashboardCardStatus> {
  const { card, dashboard, identity, editor } = options;
  if (editor.activeDashboardId === dashboard.id) {
    editor.dispatch.queuePendingBlock({
      pendingId: card.cardId,
      block: buildPendingDashboardBlock(card.block),
      dashboardId: dashboard.id,
    });
    const status = _confirmedStatus(dashboard, true);
    AgentDashboardCardStore.setStatus(identity, card.cardId, status);
    return status;
  }
  const result = await appendBlockToDashboard({
    workspaceId: identity.workspaceId as Workspace.Id,
    dashboardId: dashboard.id,
    block: card.block,
  });
  const status: AgentDashboardCardStatus =
    result.kind === "saved"
      ? _confirmedStatus(dashboard, false)
      : { status: "failed", reason: FAILURE_REASONS[result.kind] };
  AgentDashboardCardStore.setStatus(identity, card.cardId, status);
  return status;
}
