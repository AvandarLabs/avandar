import {
  formatDashboardCardLine,
  REDACTED_DASHBOARD_NAME,
} from "$/agent/dashboardBlocks/dashboardCardLine";
import { getAgentGadgetName } from "$/agent/mentions/AgentGadgetContext";
import {
  buildAgentContextBlocks,
  buildAgentGadgetModelName,
} from "$/agent/mentions/buildAgentContextBlocks";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { AgentDashboardCardStore } from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import { createAgentPageNameLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/agentPageNameLoader";
import { createAgentPageContext } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext";
import { parseAgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import { isPersonalDataText } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { OFFLINE_SQL_TILE_BUDGET } from "@/lib/agent/dataAgent/offline/offlineContextBudget";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { AgentDashboardCardIdentity } from "@/components/ChatPanel/AgentDashboardCardStore/AgentDashboardCardStore";
import type {
  AgentTurnGadgetContext,
  DataAgentConversation,
  DataAgentTurnOptions,
} from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";
import type { AgentTurnInputs } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentTurnHelpers";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";

/** The page state the adapter has when a turn starts. */
export type AgentPageInputs = {
  pathname: string;
  chatPageContext: ChatPageContext.T;
  dashboardEditorState: DashboardEditorAppState;
};

/**
 * What counts as personal in page SQL: values that go with a column whose
 * name looks personal or that is none of the datasets' columns (an alias
 * may stand for a personal one), and values that look personal on their
 * own.
 */
function _createPageSqlDetectors(
  datasets: readonly DataAgentDataset[],
): SqlLiteralDetectors {
  return {
    isSensitiveColumn: isPersonalColumnName,
    isSensitiveValue: isPersonalDataText,
    knownColumnNames: new Set(
      datasets.flatMap((dataset) => {
        return dataset.columns.map((column) => {
          return column.name.toLowerCase();
        });
      }),
    ),
  };
}

/**
 * What is on screen for this turn, read for the agent's blocks. When
 * reading the page fails, the route still names the page, so results keep
 * going where the user is looking.
 */
export async function readAgentPageContext(
  page: Readonly<AgentPageInputs>,
  datasets: readonly DataAgentDataset[],
  workspaceId: Workspace.Id,
): Promise<AgentPageContext> {
  try {
    return await createAgentPageContext({
      ...page,
      datasets,
      loader: createAgentPageNameLoader(workspaceId),
    });
  } catch {
    return { app: parseAgentPageRoute(page.pathname).app };
  }
}

/** A ref's loaded context, or `unavailable` when it was not loaded. */
function _contextOf(
  gadgetContext: AgentTurnGadgetContext | undefined,
  ref: Gadget.Ref,
): AgentGadgetContext {
  return (
    gadgetContext?.contexts?.get(ChatMentionToken.buildRefKey(ref)) ?? {
      kind: "unavailable",
      ref,
    }
  );
}

type TurnInputsOptions = {
  conversation: DataAgentConversation;
  datasets: readonly DataAgentDataset[];
  pageContext: AgentPageContext | undefined;
  turn: Readonly<DataAgentTurnOptions>;
  /**
   * `hosted` redacts SQL and masks names through the conversation's vault
   * for a model off the device. `device` sends real values and names, as an
   * offline model may read them, with SQL for at most three charts.
   */
  privacy: "hosted" | "device";
};

/** The SQL a gadget's charts filter with, empty strings left out. */
function _gadgetSql(context: AgentGadgetContext | undefined): string[] {
  switch (context?.kind) {
    case "dashboard":
      return context.tiles
        .map((tile) => {
          return tile.sql;
        })
        .filter(Boolean);
    case "dashboard_tile":
      return [context.tile.sql].filter(Boolean);
    default:
      return [];
  }
}

/**
 * Redacts the SQL of gadgets only earlier user messages mention. No block
 * shows it, but the recap names those gadgets, so the vault must hold the
 * values it filters on before any name is masked.
 */
function _redactEarlierMentionSql(
  turn: Readonly<DataAgentTurnOptions>,
  question: string,
  redactSql: (sql: string) => void,
): void {
  const contexts = turn.gadgetContext?.contexts;
  const questionKeys = new Set(
    ChatMentionToken.refsFromText(question).map(ChatMentionToken.buildRefKey),
  );
  turn.apiMessages
    .flatMap((message) => {
      return message.role === "user"
        ? ChatMentionToken.refsFromText(message.content)
        : [];
    })
    .map(ChatMentionToken.buildRefKey)
    .filter((key) => {
      return !questionKeys.has(key);
    })
    .forEach((key) => {
      _gadgetSql(contexts?.get(key)).forEach(redactSql);
    });
}

/**
 * The page, attached, and mentioned blocks in one redaction pass through
 * the conversation's vault. Mentions come from the message being answered.
 * Nothing is attached or mentioned when the gadgets failed to load. The SQL
 * of gadgets earlier messages mention is redacted first, so their recap
 * names are masked too.
 */
function _buildBlocks(
  options: Readonly<TurnInputsOptions>,
): AgentContextBlocks {
  const { gadgetContext } = options.turn;
  const { sqlVault } = options.conversation;
  const isHosted = options.privacy === "hosted";
  const detectors = _createPageSqlDetectors(options.datasets);
  const isLoaded = gadgetContext?.contexts !== undefined;
  // The raw question, which still holds the ref tokens.
  const question = getLastQuestionFromMessages(options.turn.apiMessages);
  const toContext = (ref: Gadget.Ref): AgentGadgetContext => {
    return _contextOf(gadgetContext, ref);
  };
  const redactSql = (sql: string): string => {
    return sqlVault.redact(sql, detectors);
  };
  // Every redaction happens before `buildAgentContextBlocks` masks a name.
  if (isHosted) {
    _redactEarlierMentionSql(options.turn, question, redactSql);
  }
  return buildAgentContextBlocks({
    page: options.pageContext,
    attached: isLoaded ? gadgetContext.attachedRefs.map(toContext) : [],
    mentioned: isLoaded
      ? ChatMentionToken.refsFromText(question).map(toContext)
      : [],
    aliases: SqlTableAlias.fromSchema({ datasets: options.datasets }),
    isSensitive: isPersonalDataText,
    redactSql: isHosted ? redactSql : undefined,
    maskText: isHosted ? sqlVault.maskText : undefined,
    maxSqlTiles: isHosted ? undefined : OFFLINE_SQL_TILE_BUDGET,
  });
}

/** The session the turn's dashboard cards belong to, when it is known. */
function _cardIdentityOf(
  turn: Readonly<DataAgentTurnOptions>,
): AgentDashboardCardIdentity | undefined {
  const userId = turn.currentUser?.id;
  return userId && turn.sessionId
    ? { workspaceId: turn.workspaceId, userId, sessionId: turn.sessionId }
    : undefined;
}

/**
 * One line per card the user resolved since the agent last heard, and a
 * callback that marks them heard once the agent has replied. A hosted
 * turn's name that looks personal on its own is replaced, since the user
 * may have picked a name the model never saw.
 */
function _dashboardCardInputs(
  turn: Readonly<DataAgentTurnOptions>,
  options: Readonly<{ isHosted: boolean; mask: (text: string) => string }>,
): Pick<AgentTurnInputs, "dashboardCardLines" | "onReplied"> {
  const identity = _cardIdentityOf(turn);
  if (!identity) {
    return { dashboardCardLines: [] };
  }
  const maskName = (name: string): string => {
    return options.isHosted && isPersonalDataText(name)
      ? REDACTED_DASHBOARD_NAME
      : options.mask(name);
  };
  const unreported = AgentDashboardCardStore.listUnreported(identity);
  return {
    dashboardCardLines: unreported.map(({ status }) => {
      return formatDashboardCardLine(
        status.status === "confirmed"
          ? {
              kind: "confirmed",
              dashboardName: status.dashboardName,
              isUnsaved: status.isUnsaved,
            }
          : { kind: "cancelled" },
        maskName,
      );
    }),
    onReplied: () => {
      AgentDashboardCardStore.markReported(
        identity,
        unreported.map(({ cardId }) => {
          return cardId;
        }),
      );
    },
  };
}

function _keepText(text: string): string {
  return text;
}

/**
 * The turn's blocks, the mention names, and the lines about dashboard cards
 * the user resolved since the agent last heard. A `hosted` turn masks every
 * name with the conversation's vault after every block's SQL is redacted. A
 * `device` turn keeps real names. When the gadgets failed to load, a
 * non-empty tray's attached block repeats last turn's, so the model reads
 * "unchanged", and every mention is named as unavailable.
 */
export function buildAgentTurnInputs(
  options: Readonly<TurnInputsOptions>,
): AgentTurnInputs {
  const { conversation } = options;
  const { gadgetContext } = options.turn;
  const isHosted = options.privacy === "hosted";
  const mask = isHosted ? conversation.sqlVault.maskText : _keepText;
  const blocks = _buildBlocks(options);
  if (isHosted && options.turn.titleMaskRef) {
    options.turn.titleMaskRef.current = mask;
  }
  // A failed load with a tray repeats last turn's tray. With an empty tray
  // the attached block stays empty, so the model hears it was cleared.
  const isTrayUnknown =
    gadgetContext !== undefined &&
    !gadgetContext.contexts &&
    gadgetContext.attachedRefs.length > 0;
  return {
    blocks: isTrayUnknown
      ? { ...blocks, attachedBlock: conversation.lastAttachedBlock }
      : blocks,
    nameOf: (ref) => {
      const context = _contextOf(gadgetContext, ref);
      return isHosted
        ? buildAgentGadgetModelName(context, {
            isSensitive: isPersonalDataText,
            mask,
          })
        : getAgentGadgetName(context);
    },
    // Called only once the blocks above have redacted every piece of the
    // turn's SQL, so the vault holds every value to mask.
    maskAssistantText: mask,
    ...(isHosted ? { unmaskReplyText: conversation.sqlVault.unmaskText } : {}),
    // Built after the blocks, so the vault holds every value a name could
    // match.
    ..._dashboardCardInputs(options.turn, { isHosted, mask }),
  };
}
