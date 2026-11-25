import { appendBlockToDashboard } from "@/clients/dashboards/agentDashboards/agentDashboards";
import { AgentDashboardCardStore } from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock/buildPendingDashboardBlock";
import type { AnalyticsEventPayloads } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  AgentDashboardCardIdentity,
  AgentDashboardCardStatus,
} from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import type { AgentDashboardCandidate } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import type {
  DashboardEditorAppState,
  DashboardEditorStateManager,
} from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

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

/** What confirming a card needs: the card, its dashboard, and the editor. */
type ConfirmAgentDashboardCardOptions = {
  card: AgentDashboardBlockData;
  dashboard: AgentDashboardCandidate;
  identity: AgentDashboardCardIdentity;
  editor: {
    activeDashboardId: string | undefined;
    editorData: DashboardEditorAppState["editorData"];
    dispatch: Pick<
      ReturnType<typeof DashboardEditorStateManager.useDispatch>,
      "queuePendingBlock"
    >;
  };
};

/** Logs that a confirmed card's block reached its dashboard. */
function _logBlockAdded(
  identity: AgentDashboardCardIdentity,
  payload: AnalyticsEventPayloads["dashboard.block_added_via_chat"],
): void {
  void AnalyticsClient.logEvent({
    event: "dashboard.block_added_via_chat",
    workspaceId: identity.workspaceId as Workspace.Id,
    app: "dashboards",
    payload,
  });
}

/**
 * Queues the card's block unsaved into the editor showing its dashboard,
 * logs it, and records the card confirmed. The payload is built first, so
 * its count reads the editor's content before the block lands.
 */
function _confirmIntoEditor(
  options: Readonly<ConfirmAgentDashboardCardOptions>,
): AgentDashboardCardStatus {
  const { card, dashboard, identity, editor } = options;
  const payload = ChatAnalyticsPayloads.fromDashboardBlock({
    block: card.block,
    dashboardId: dashboard.id,
    editorState: editor,
  });
  editor.dispatch.queuePendingBlock({
    pendingId: card.cardId,
    block: buildPendingDashboardBlock(card.block),
    dashboardId: dashboard.id,
  });
  _logBlockAdded(identity, payload);
  const status = _confirmedStatus(dashboard, true);
  AgentDashboardCardStore.setStatus(identity, card.cardId, status);
  return status;
}

/**
 * Confirms a dashboard card. When the dashboard is open in the editor right
 * now, the block goes there unsaved, since the editor's next Save would
 * overwrite a row written underneath it. Otherwise the block is saved to
 * the dashboard. A block that reaches the dashboard is logged once. The
 * card's status records how it ended.
 */
export async function confirmAgentDashboardCard(
  options: Readonly<ConfirmAgentDashboardCardOptions>,
): Promise<AgentDashboardCardStatus> {
  const { card, dashboard, identity, editor } = options;
  if (editor.activeDashboardId === dashboard.id) {
    return _confirmIntoEditor(options);
  }
  const result = await appendBlockToDashboard({
    workspaceId: identity.workspaceId as Workspace.Id,
    dashboardId: dashboard.id,
    block: card.block,
  });
  if (result.kind === "saved") {
    _logBlockAdded(
      identity,
      ChatAnalyticsPayloads.fromDashboardBlock({
        block: card.block,
        dashboardId: dashboard.id,
      }),
    );
  }
  const status: AgentDashboardCardStatus =
    result.kind === "saved"
      ? _confirmedStatus(dashboard, false)
      : { status: "failed", reason: FAILURE_REASONS[result.kind] };
  AgentDashboardCardStore.setStatus(identity, card.cardId, status);
  return status;
}
