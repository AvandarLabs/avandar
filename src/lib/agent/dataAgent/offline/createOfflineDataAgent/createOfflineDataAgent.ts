import { splitAgentTurnText } from "$/agent/pageContext/buildAgentTurnText";
import { getDashboardContextFromTurnBlocks } from "$/agent/pageContext/getDashboardContextFromTurnBlocks/getDashboardContextFromTurnBlocks";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import {
  buildOfflineDataAgentSystemPrompt,
  buildOfflineQuestionMessage,
} from "@/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt";
import {
  classifyOfflineMessage,
  namesDashboard,
} from "@/lib/agent/dataAgent/offline/classifyOfflineMessage/classifyOfflineMessage";
import { findQuestionValues } from "@/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues";
import { profileOfflineDatasets } from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";
import {
  createLocalModel,
  createLocalModelStreamFn,
} from "@/lib/agent/localModels/createLocalModelStreamFn/createLocalModelStreamFn";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { TurnDashboardContext } from "$/agent/pageContext/getDashboardContextFromTurnBlocks/getDashboardContextFromTurnBlocks";
import type {
  DataAgent,
  DataAgentReply,
} from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { OfflineMessageRoute } from "@/lib/agent/dataAgent/offline/classifyOfflineMessage/classifyOfflineMessage";
import type { OfflineDatasetProfile } from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";
import type { LocalLlm } from "@/lib/agent/localModels/LocalLlm";
import type { Agent } from "@earendil-works/pi-agent-core";
import type { TranscriptContext } from "@earendil-works/pi-ai";

/** Rows an offline model sees after each query to check its answer. */
const OFFLINE_PREVIEW_ROW_COUNT = 5;

/** WebLLM model ids for each job in the offline agent. */
export type OfflineDataAgentModels = {
  /** Writes the queries and replies. */
  answer: string;
  /** Takes over after a failed or empty query, when set. */
  escalation?: string;
  /** Sorts messages into data questions and chat, when set. */
  router?: string;
};

/** Options for {@link createOfflineDataAgent}. */
export type CreateOfflineDataAgentOptions = {
  datasets: readonly DataAgentDataset[];
  host: DataAgentHost;
  llm: LocalLlm;
  models: OfflineDataAgentModels;
  contextWindow: number;
  /** Today's date as `YYYY-MM-DD`. */
  today: string;
  /**
   * `plan`: answer with query plans that code turns into SQL. `sql`: write
   * SQL directly. Default `sql`.
   */
  queryStyle?: "sql" | "plan";
};

/** True once a tool has answered since the user's latest message. */
function _hasToolResultSinceUser(context: TranscriptContext): boolean {
  for (let index = context.messages.length - 1; index >= 0; index -= 1) {
    const role = context.messages[index]?.role;
    if (role === "toolResult") {
      return true;
    }
    if (role === "user") {
      return false;
    }
  }
  return false;
}

/**
 * Swaps the prompt in the transcript's leading system message. Local models
 * have no prompt cache to keep warm, so each question gets its own prompt
 * (with that question's values) instead of an appended update.
 */
function _replaceSystemPrompt(agent: Agent, systemPrompt: string): void {
  const [leading, ...rest] = agent.state.messages;
  if (leading?.role !== "system") {
    return;
  }
  agent.state.messages = [{ ...leading, content: systemPrompt }, ...rest];
}

/** What the offline agent remembers between questions. */
type OfflineSession = {
  route: { current: OfflineMessageRoute };
  /**
   * Whether the latest turn can be about a dashboard: the page or an
   * attached gadget is one, a card line or mention brings one, or the
   * message names one. Adds the dashboard rules to its prompt and the
   * dashboard tool to its tool list.
   */
  hasDashboardContext: boolean;
  /**
   * What the latest turn's blocks said about the page and the tray, so a
   * later block that says "unchanged" still counts.
   */
  dashboardContext: TurnDashboardContext;
  profiles?: Promise<OfflineDatasetProfile[]>;
  previousMessage?: string;
};

/** Puts the turn's leading blocks back in front of the model's text. */
function _withBlocks(blocks: string, text: string): string {
  return blocks ? `${blocks}\n\n${text}` : text;
}

/**
 * What a turn's blocks say about the page and the tray, read against what the
 * model last heard, and whether that makes the turn one that can be about a
 * dashboard. A plain question on a Data Explorer page, with its page block, is
 * not. Nothing is remembered here: the session takes the context only once
 * the model has the turn's text.
 */
function _readDashboardContext(
  session: OfflineSession,
  blocks: string,
  question: string,
): { context: TurnDashboardContext; hasDashboardContext: boolean } {
  const context = getDashboardContextFromTurnBlocks(
    blocks,
    session.dashboardContext,
  );
  return {
    context,
    hasDashboardContext:
      context.isPageDashboard ||
      context.isAttachedDashboard ||
      context.hasDashboardInTurn ||
      namesDashboard(question),
  };
}

/** What the offline agent hands its model for one question. */
type PreparedQuestion = {
  systemPrompt: string;
  messageText: string;
  /** What the turn's blocks said, to remember once the agent has the turn. */
  dashboardContext: TurnDashboardContext;
};

/** Sorts the user's message into data or chat, and remembers it. */
async function _routeQuestion(
  options: Readonly<CreateOfflineDataAgentOptions>,
  session: OfflineSession,
  question: string,
): Promise<void> {
  session.route.current = options.models.router
    ? await classifyOfflineMessage(options.llm, {
        modelId: options.models.router,
        message: question,
        previousMessage: session.previousMessage,
        datasetNames: options.datasets.map((dataset) => {
          return dataset.name;
        }),
      })
    : "data";
  session.previousMessage = question;
}

/**
 * Routes the question, profiles the datasets once per conversation, and
 * finds the question's stored values. Returns the system prompt (the same
 * for every plain question, so it stays cached, and longer only when the
 * turn can be about a dashboard) and the message the model reads for this
 * question, with what the turn's blocks said about the page and the tray, for
 * the session to remember once the model has the turn. Records on the session
 * whether the turn has dashboard context. Routing and value matching read
 * only the user's message; the blocks before it go to the model unchanged.
 */
async function _prepareQuestion(
  options: Readonly<CreateOfflineDataAgentOptions>,
  session: OfflineSession,
  message: string,
): Promise<PreparedQuestion> {
  const { blocks, message: question } = splitAgentTurnText(message);
  session.profiles ??= profileOfflineDatasets(options.host, options.datasets);
  await _routeQuestion(options, session, question);
  const profiles = await session.profiles;
  const { context, hasDashboardContext } = _readDashboardContext(
    session,
    blocks,
    question,
  );
  session.hasDashboardContext = hasDashboardContext;
  const systemPrompt = buildOfflineDataAgentSystemPrompt({
    datasets: options.datasets,
    profiles,
    today: options.today,
    queryStyle: options.queryStyle,
    hasDashboardContext,
  });
  if (session.route.current === "chat") {
    return {
      systemPrompt,
      messageText: _withBlocks(blocks, question),
      dashboardContext: context,
    };
  }
  const matches = await findQuestionValues(options.host, {
    datasets: options.datasets,
    profiles,
    question,
  });
  const questionMessage = buildOfflineQuestionMessage({
    question,
    matches,
    datasets: options.datasets,
  });
  return {
    systemPrompt,
    messageText: _withBlocks(blocks, questionMessage),
    dashboardContext: context,
  };
}

/**
 * Prepares the question, then hands it to the agent. The session takes the
 * turn's page and tray context only at that hand-off, so a turn that failed
 * before the model had its text leaves what the model last heard as it was.
 * Once the agent has the text it is in the transcript, so a model call that
 * then fails does not undo it.
 */
async function _askPrepared(
  options: Readonly<CreateOfflineDataAgentOptions>,
  session: OfflineSession,
  dataAgent: DataAgent,
  message: string,
): Promise<DataAgentReply> {
  const prepared = await _prepareQuestion(options, session, message);
  _replaceSystemPrompt(dataAgent.agent, prepared.systemPrompt);
  session.dashboardContext = prepared.dashboardContext;
  return dataAgent.ask(prepared.messageText);
}

function _createLocalChoice(modelId: string, contextWindow: number) {
  return {
    model: createLocalModel({ id: modelId, name: modelId, contextWindow }),
    thinkingLevel: "off" as const,
  };
}

/**
 * The data agent for offline mode: the same Pi agent, tools, and host as the
 * hosted agent, with its model calls answered on the device. Because the
 * model is local, it may see the data, so each question gets more help than
 * a hosted model would: a profile of every dataset, the question's values as
 * stored, the first rows of each result to check, and a router that makes a
 * data question run a query before the agent replies. Its dashboard tool and
 * rules come only on a turn that can use them, since a small model reads a
 * longer prompt and tool list less well.
 */
export function createOfflineDataAgent(
  options: Readonly<CreateOfflineDataAgentOptions>,
): DataAgent {
  const route: { current: OfflineMessageRoute } = { current: "data" };
  const session: OfflineSession = {
    route,
    hasDashboardContext: false,
    dashboardContext: {
      isPageDashboard: false,
      isAttachedDashboard: false,
      hasDashboardInTurn: false,
    },
  };
  const { models, contextWindow } = options;
  const dataAgent = createDataAgent({
    datasets: options.datasets,
    host: options.host,
    policy: {
      primary: _createLocalChoice(models.answer, contextWindow),
      escalation: models.escalation
        ? _createLocalChoice(models.escalation, contextWindow)
        : undefined,
    },
    streamFn: createLocalModelStreamFn({
      llm: options.llm,
      isReplyAllowed: (context) => {
        return route.current === "chat" || _hasToolResultSinceUser(context);
      },
    }),
    today: options.today,
    previewRowCount: OFFLINE_PREVIEW_ROW_COUNT,
    queryTools: options.queryStyle ?? "sql",
    shouldOfferDashboardTool: () => {
      return session.hasDashboardContext;
    },
  });
  return {
    agent: dataAgent.agent,
    ask: async (message) => {
      return _askPrepared(options, session, dataAgent, message);
    },
  };
}
