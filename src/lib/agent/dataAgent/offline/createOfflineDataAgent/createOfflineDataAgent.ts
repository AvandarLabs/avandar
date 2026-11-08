import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { buildOfflineDataAgentSystemPrompt } from "@/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt";
import { classifyOfflineMessage } from "@/lib/agent/dataAgent/offline/classifyOfflineMessage/classifyOfflineMessage";
import { findQuestionValues } from "@/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues";
import { profileOfflineDatasets } from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";
import {
  createLocalModel,
  createLocalModelStreamFn,
} from "@/lib/agent/localModels/createLocalModelStreamFn/createLocalModelStreamFn";
import type { DataAgentDataset } from "@/lib/agent/dataAgent/buildDataAgentSystemPrompt/buildDataAgentSystemPrompt";
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

/**
 * Routes the question, profiles the datasets once per conversation, finds
 * the question's stored values, and returns the prompt for this question.
 */
async function _prepareQuestion(
  options: Readonly<CreateOfflineDataAgentOptions>,
  session: OfflineSession,
  message: string,
): Promise<string> {
  session.profiles ??= profileOfflineDatasets(options.host, options.datasets);
  session.route.current = options.models.router
    ? await classifyOfflineMessage(options.llm, {
        modelId: options.models.router,
        message,
        previousMessage: session.previousMessage,
        datasetNames: options.datasets.map((dataset) => {
          return dataset.name;
        }),
      })
    : "data";
  session.previousMessage = message;
  const profiles = await session.profiles;
  const matches =
    session.route.current === "data"
      ? await findQuestionValues(options.host, {
          datasets: options.datasets,
          profiles,
          question: message,
        })
      : [];
  return buildOfflineDataAgentSystemPrompt({
    datasets: options.datasets,
    profiles,
    matches,
    today: options.today,
  });
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
  });
  const session: OfflineSession = { route };
  return {
    agent: dataAgent.agent,
    ask: async (message) => {
      _replaceSystemPrompt(
        dataAgent.agent,
        await _prepareQuestion(options, session, message),
      );
      return dataAgent.ask(message);
    },
  };
}
