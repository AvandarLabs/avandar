import { Agent } from "@earendil-works/pi-agent-core";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import { buildDataAgentSystemPrompt } from "@/lib/agent/dataAgent/buildDataAgentSystemPrompt/buildDataAgentSystemPrompt";
import { createAskUserTool } from "@/lib/agent/dataAgent/createDataAgentTools/askUserTool";
import { createLookupValuesTool } from "@/lib/agent/dataAgent/createDataAgentTools/lookupValuesTool";
import { createPlanQueryTool } from "@/lib/agent/dataAgent/createDataAgentTools/planQueryTool";
import { createRunQueryTool } from "@/lib/agent/dataAgent/createDataAgentTools/runQueryTool";
import { createDataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type { DataAgentDataset } from "@/lib/agent/dataAgent/buildDataAgentSystemPrompt/buildDataAgentSystemPrompt";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { DataAgentRunState } from "@/lib/agent/dataAgent/DataAgentRunState";
import type {
  AgentEvent,
  StreamFn,
  ThinkingLevel,
} from "@earendil-works/pi-agent-core";
import type {
  Api,
  AssistantMessage,
  Model,
  Usage,
} from "@earendil-works/pi-ai";

/** Model requests per user message, after which the agent stops. */
const MAX_MODEL_TURNS_PER_ANSWER = 6;

/** A model and how hard it should think. */
export type DataAgentModelChoice = {
  model: Model<Api>;
  thinkingLevel: ThinkingLevel;
};

/**
 * Which models answer. `primary` answers first; `escalation`, when set, takes
 * over for the rest of an answer after a query fails or finds nothing.
 */
export type DataAgentModelPolicy = {
  primary: DataAgentModelChoice;
  escalation?: DataAgentModelChoice;
};

/** Tokens and billed cost of the model calls behind one answer. */
export type DataAgentUsage = {
  calls: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cost: number;
};

/** What one user message produced. */
export type DataAgentReply = {
  /** The text to show: the model's reply, or the query summary. */
  text: string;
  state: DataAgentRunState;
  usage: DataAgentUsage;
  /** Models that answered, in order. */
  modelIds: string[];
};

/** A data agent bound to one conversation. */
export type DataAgent = {
  agent: Agent;
  ask: (message: string) => Promise<DataAgentReply>;
};

function _addUsage(total: DataAgentUsage, usage: Usage): DataAgentUsage {
  return {
    calls: total.calls + 1,
    inputTokens:
      total.inputTokens + usage.input + usage.cacheRead + usage.cacheWrite,
    cachedInputTokens: total.cachedInputTokens + usage.cacheRead,
    outputTokens: total.outputTokens + usage.output,
    reasoningTokens: total.reasoningTokens + (usage.reasoning ?? 0),
    cost: total.cost + usage.cost.total,
  };
}

/**
 * The reply to show. When the turn ended on a query, the query's summary is
 * the answer; any text the model wrote beside the tool call is narration
 * ("let me run that") written before the query ran.
 */
function _getReplyText(
  messages: Agent["state"]["messages"],
  state: DataAgentRunState,
): string {
  const lastAssistant = [...messages].reverse().find((message) => {
    return message.role === "assistant";
  }) as AssistantMessage | undefined;
  const endedOnToolCall = (lastAssistant?.content ?? []).some((block) => {
    return block.type === "toolCall";
  });
  if (endedOnToolCall && state.lastQuery?.outcome.kind === "rows") {
    return state.lastQuery.summary;
  }
  const text = (lastAssistant?.content ?? [])
    .flatMap((block) => {
      return block.type === "text" ? [block.text] : [];
    })
    .join("\n")
    .trim();
  return text || state.lastQuery?.summary || "";
}

function _createTools(
  options: Readonly<CreateDataAgentOptions>,
  aliases: readonly SqlTableAlias.T[],
  state: DataAgentRunState,
): Array<
  | ReturnType<typeof createRunQueryTool>
  | ReturnType<typeof createPlanQueryTool>
  | ReturnType<typeof createLookupValuesTool>
  | ReturnType<typeof createAskUserTool>
> {
  const queryContext = {
    host: options.host,
    aliases,
    state,
    previewRowCount: options.previewRowCount,
  };
  const askUser = createAskUserTool({ host: options.host, state });
  if (options.queryTools === "plan") {
    return [
      createPlanQueryTool(queryContext, options.datasets),
      createRunQueryTool(queryContext),
      askUser,
    ];
  }
  return [
    createRunQueryTool(queryContext),
    createLookupValuesTool({ host: options.host, aliases, state }),
    askUser,
  ];
}

function _createAgent(
  options: Readonly<CreateDataAgentOptions>,
  state: DataAgentRunState,
  turnCounter: { turns: number },
): Agent {
  const aliases = SqlTableAlias.fromSchema({ datasets: options.datasets });
  const { primary, escalation } = options.policy;
  return new Agent({
    initialState: {
      systemPrompt: buildDataAgentSystemPrompt({
        datasets: options.datasets,
        today: options.today,
      }),
      model: primary.model,
      thinkingLevel: primary.thinkingLevel,
      tools: _createTools(options, aliases, state),
    },
    streamFn: options.streamFn,
    sessionId: options.sessionId,
    prepareNextTurn: () => {
      return state.needsEscalation && escalation
        ? { model: escalation.model, thinkingLevel: escalation.thinkingLevel }
        : undefined;
    },
    finishTurn: () => {
      turnCounter.turns += 1;
      return turnCounter.turns >= MAX_MODEL_TURNS_PER_ANSWER
        ? { action: "end" }
        : undefined;
    },
  });
}

/** Options for {@link createDataAgent}. */
export type CreateDataAgentOptions = {
  datasets: readonly DataAgentDataset[];
  host: DataAgentHost;
  policy: DataAgentModelPolicy;
  streamFn: StreamFn;
  /** Today's date as `YYYY-MM-DD`, for relative periods. */
  today: string;
  /** Lets providers route a conversation's calls to one prompt cache. */
  sessionId?: string;
  /**
   * Rows the model sees after each query, to check its answer. Only for a
   * model on the user's device; a hosted model never sees rows.
   */
  previewRowCount?: number;
  /**
   * `plan`: the model answers with `plan_query` (slots that code turns into
   * SQL) and keeps `run_query` for what a plan cannot express. For small
   * on-device models. Default `sql`.
   */
  queryTools?: "sql" | "plan";
};

/**
 * Creates the Pi-based data agent for one conversation: three tools (run a
 * query, look up stored values, ask the user), a cache-friendly system
 * prompt, and a model policy that escalates to a stronger model only when a
 * query fails or comes back empty.
 */
export function createDataAgent(
  options: Readonly<CreateDataAgentOptions>,
): DataAgent {
  const state = createDataAgentRunState();
  const turnCounter = { turns: 0 };
  const agent = _createAgent(options, state, turnCounter);
  return {
    agent,
    ask: async (message) => {
      Object.assign(state, createDataAgentRunState());
      turnCounter.turns = 0;
      agent.state.model = options.policy.primary.model;
      agent.state.thinkingLevel = options.policy.primary.thinkingLevel;
      let usage: DataAgentUsage = {
        calls: 0,
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cost: 0,
      };
      const modelIds: string[] = [];
      const unsubscribe = agent.subscribe((event: AgentEvent) => {
        if (
          event.type === "message_end" &&
          event.message.role === "assistant"
        ) {
          usage = _addUsage(usage, event.message.usage);
          modelIds.push(event.message.model);
        }
      });
      try {
        await agent.prompt(message);
      } finally {
        unsubscribe();
      }
      return {
        text: _getReplyText(agent.state.messages, state),
        state,
        usage,
        modelIds,
      };
    },
  };
}
