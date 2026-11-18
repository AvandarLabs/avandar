import {
  canEditDashboard,
  loadWorkspaceDashboardCandidates,
} from "@/clients/dashboards/agentDashboards/agentDashboards";
import { AgentDashboardBlock } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import { resolveAgentDashboardTarget } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock/buildPendingDashboardBlock";
import type { AgentDashboardBlockData } from "@/components/ChatPanel/ChatThread/AgentDashboardBlockPart/AgentDashboardBlock";
import type {
  AgentTurnGadgetContext,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { AgentDashboardCandidate } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import type {
  DataAgentDashboardBlockOutcome,
  DataAgentHost,
} from "@/lib/agent/dataAgent/DataAgentHost";

type AddDashboardBlockRequest = Parameters<
  NonNullable<DataAgentHost["addDashboardBlock"]>
>[0];

/** Every dashboard the turn's mentions and tray name. */
function _contextDashboardsOf(
  gadgetContext: AgentTurnGadgetContext | undefined,
): AgentDashboardCandidate[] {
  return [...(gadgetContext?.contexts?.values() ?? [])].flatMap((context) => {
    return context.kind === "dashboard"
      ? [{ id: context.ref.gadgetId, name: context.name }]
      : [];
  });
}

/**
 * The workspace's dashboards each turn loaded, by the turn's options. A turn
 * is a fresh object, so nothing carries over to the next one.
 */
const workspaceDashboardsByTurn = new WeakMap<
  DataAgentTurnOptions,
  Promise<readonly AgentDashboardCandidate[]>
>();

/**
 * The workspace's dashboards, loaded once per turn however many times the
 * agent names a dashboard. A failed load is not kept, so the next call
 * tries again.
 */
function _loadWorkspaceDashboardsOnce(
  turn: DataAgentTurnOptions,
): Promise<readonly AgentDashboardCandidate[]> {
  const existing = workspaceDashboardsByTurn.get(turn);
  if (existing) {
    return existing;
  }
  const loading = loadWorkspaceDashboardCandidates(turn.workspaceId);
  workspaceDashboardsByTurn.set(turn, loading);
  loading.catch(() => {
    workspaceDashboardsByTurn.delete(turn);
  });
  return loading;
}

/**
 * The browser's `addDashboardBlock`. Finds the dashboard the agent named
 * on this device, then queues the block unsaved into the open editor, or
 * adds a card to this turn's reply. Nothing is saved here: a card saves
 * only when the user confirms it.
 */
export async function addAgentDashboardBlock(
  options: Readonly<{
    turn: DataAgentTurnOptions;
    cards: AgentDashboardBlockData[];
    request: AddDashboardBlockRequest;
  }>,
): Promise<DataAgentDashboardBlockOutcome> {
  const { turn, request } = options;
  const pageDashboard = turn.pageContext?.dashboard;
  const target = await resolveAgentDashboardTarget({
    requested: request.dashboard,
    openEditorDashboardId: turn.dashboardEditor?.activeDashboardId,
    pageDashboard: pageDashboard
      ? { id: pageDashboard.id, name: pageDashboard.name }
      : undefined,
    contextDashboards: _contextDashboardsOf(turn.gadgetContext),
    loadWorkspaceDashboards: () => {
      return _loadWorkspaceDashboardsOnce(turn);
    },
    canEdit: canEditDashboard,
  });
  if (target.kind === "editor" && turn.dashboardEditor) {
    turn.dashboardEditor.dispatch.queuePendingBlock({
      pendingId: crypto.randomUUID(),
      block: buildPendingDashboardBlock(request.block),
      dashboardId: target.dashboardId,
    });
    return { kind: "added_to_editor" };
  }
  if (target.kind === "card") {
    options.cards.push(
      AgentDashboardBlock.create({
        block: request.block,
        candidates: target.candidates,
      }),
    );
    return { kind: "card_shown" };
  }
  return target.kind === "editor" ? { kind: "no_current" } : target;
}
