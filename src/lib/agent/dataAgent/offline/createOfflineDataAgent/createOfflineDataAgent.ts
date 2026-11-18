import { splitAgentTurnText } from "$/agent/pageContext/buildAgentTurnText";
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
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
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
  profiles?: Promise<OfflineDatasetProfile[]>;
  previousMessage?: string;
};

/** Puts the turn's leading blocks back in front of the model's text. */
function _withBlocks(blocks: string, text: string): string {
  return blocks ? `${blocks}\n\n${text}` : text;
}

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
 * turn carries blocks or names a dashboard) and the message the model reads
 * for this question. Routing and value matching read only the user's
 * message; the blocks before it go to the model unchanged.
 */
async function _prepareQuestion(
  options: Readonly<CreateOfflineDataAgentOptions>,
  session: OfflineSession,
  message: string,
): Promise<{ systemPrompt: string; messageText: string }> {
  const { blocks, message: question } = splitAgentTurnText(message);
  session.profiles ??= profileOfflineDatasets(options.host, options.datasets);
  await _routeQuestion(options, session, question);
  const profiles = await session.profiles;
  const systemPrompt = buildOfflineDataAgentSystemPrompt({
    datasets: options.datasets,
    profiles,
    today: options.today,
    queryStyle: options.queryStyle,
    hasDashboardContext: blocks !== "" || namesDashboard(question),
  });
  if (session.route.current === "chat") {
    return { systemPrompt, messageText: _withBlocks(blocks, question) };
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
  return { systemPrompt, messageText: _withBlocks(blocks, questionMessage) };
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
 * data question run a query before the agent replies.
 */
export function createOfflineDataAgent(
  options: Readonly<CreateOfflineDataAgentOptions>,
): DataAgent {
  const route: { current: OfflineMessageRoute } = { current: "data" };
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
  });
  const session: OfflineSession = { route };
  return {
    agent: dataAgent.agent,
    ask: async (message) => {
      const prepared = await _prepareQuestion(options, session, message);
      _replaceSystemPrompt(dataAgent.agent, prepared.systemPrompt);
      return dataAgent.ask(prepared.messageText);
    },
  };
}
