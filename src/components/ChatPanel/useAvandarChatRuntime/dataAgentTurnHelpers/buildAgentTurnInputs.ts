import {
  buildAgentContextBlocks,
  buildAgentGadgetModelName,
} from "$/agent/mentions/buildAgentContextBlocks";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { createAgentPageNameLoader } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/agentPageNameLoader";
import { createAgentPageContext } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/createAgentPageContext";
import { parseAgentPageRoute } from "@/components/ChatPanel/useAvandarChatRuntime/agentPageContext/parseAgentPageRoute";
import { getLastQuestionFromMessages } from "@/components/ChatPanel/useAvandarChatRuntime/getLastQuestionFromMessages/getLastQuestionFromMessages";
import { isPersonalDataText } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { Workspace } from "$/models/Workspace/Workspace";
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
  _redactEarlierMentionSql(options.turn, question, redactSql);
  return buildAgentContextBlocks({
    page: options.pageContext,
    attached: isLoaded ? gadgetContext.attachedRefs.map(toContext) : [],
    mentioned: isLoaded
      ? ChatMentionToken.refsFromText(question).map(toContext)
      : [],
    aliases: SqlTableAlias.fromSchema({ datasets: options.datasets }),
    isSensitive: isPersonalDataText,
    redactSql,
    maskText: sqlVault.maskText,
  });
}

/**
 * The turn's blocks, and the mention names masked with the same vault
 * after every block's SQL is redacted. When the gadgets failed to load,
 * a non-empty tray's attached block repeats last turn's, so the model reads
 * "unchanged", and every mention is named as unavailable.
 */
export function buildAgentTurnInputs(
  options: Readonly<TurnInputsOptions>,
): AgentTurnInputs {
  const { conversation } = options;
  const { gadgetContext } = options.turn;
  const blocks = _buildBlocks(options);
  if (options.turn.titleMaskRef) {
    options.turn.titleMaskRef.current = conversation.sqlVault.maskText;
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
      return buildAgentGadgetModelName(_contextOf(gadgetContext, ref), {
        isSensitive: isPersonalDataText,
        mask: conversation.sqlVault.maskText,
      });
    },
    // Called only once the blocks above have redacted every piece of the
    // turn's SQL, so the vault holds every value to mask.
    maskAssistantText: conversation.sqlVault.maskText,
  };
}
