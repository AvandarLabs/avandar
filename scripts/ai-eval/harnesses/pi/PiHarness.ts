import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { buildAgentPageContextBlock } from "$/agent/pageContext/buildAgentPageContextBlock";
import { buildAgentTurnText } from "$/agent/pageContext/buildAgentTurnText";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import {
  detectPii,
  isPersonalDataText,
} from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { COVID_DATASETS } from "../../covid/covidWorkspace";
import { runEvalSql } from "../../runtime/runEvalSql";
import { SimulatedUser } from "../../runtime/SimulatedUser";
import { EMPTY_EVAL_USAGE } from "../EvalHarness";
import { PI_EVAL_CONFIGS } from "./piEvalConfigs";
import type { EvalQuestion } from "../../EvalQuestion";
import type { EvalDatabase, EvalQueryResult } from "../../runtime/EvalDatabase";
import type {
  EvalAnswer,
  EvalConversation,
  EvalHarness,
  EvalUsage,
} from "../EvalHarness";
import type { PiEvalModelSpec } from "./piEvalConfigs";
import type {
  DataAgent,
  DataAgentModelPolicy,
  DataAgentReply,
} from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type {
  DataAgentHost,
  DataAgentUserAnswer,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import type { AssistantMessage } from "@earendil-works/pi-ai";

type QuestionRecorder = {
  question?: EvalQuestion;
  result?: EvalQueryResult;
  error?: string;
  vizType?: string;
  consentPrompts: number;
};

function _toUserAnswer(
  answer: ReturnType<typeof SimulatedUser.answerOptions>,
): DataAgentUserAnswer {
  return answer.kind === "custom"
    ? { kind: "typed", text: answer.text }
    : { kind: "picked", values: [answer.value].flat() };
}

/** The data agent's host in the eval: DuckDB in Node and a simulated user. */
function _createEvalHost(
  database: EvalDatabase,
  recorder: QuestionRecorder,
): DataAgentHost {
  return {
    showQuery: async (request) => {
      const outcome = await runEvalSql(database, request.sql);
      recorder.vizType = request.chart;
      if (outcome.kind === "failed") {
        recorder.result = undefined;
        recorder.error = outcome.error;
        return outcome;
      }
      recorder.result = outcome.result;
      recorder.error = undefined;
      return {
        kind: outcome.kind,
        columns: outcome.result.columns,
        rowCount: outcome.result.rows.length,
        previewRows: request.previewRowCount
          ? outcome.result.rows.slice(0, request.previewRowCount)
          : undefined,
      };
    },
    readColumnValues: async (sql) => {
      const outcome = await runEvalSql(database, sql);
      return outcome.kind === "failed"
        ? { error: outcome.error }
        : outcome.result.rows.map((row) => {
            return String(row[0]);
          });
    },
    askUser: async (request) => {
      const script = recorder.question?.user;
      return _toUserAnswer(
        request.kind === "values"
          ? SimulatedUser.pickValues(
              request.options,
              script,
              recorder.question?.prompt ?? "",
            )
          : SimulatedUser.answerOptions(request.options, script),
      );
    },
    approveValuesForModel: async (request) => {
      const needsPrompt =
        request.values.length > 0 &&
        detectPii({ values: [...request.values] }).severity !== "clean";
      recorder.consentPrompts += needsPrompt ? 1 : 0;
      return true;
    },
  };
}

function _createPolicy(
  models: ReturnType<typeof createModels>,
  specs: Readonly<{ primary: PiEvalModelSpec; escalation?: PiEvalModelSpec }>,
): DataAgentModelPolicy {
  const toChoice = (spec: PiEvalModelSpec) => {
    const model = models.getModel("openrouter", spec.id);
    if (!model) {
      throw new Error(`Pi has no OpenRouter model "${spec.id}"`);
    }
    return { model, thinkingLevel: spec.thinkingLevel };
  };
  return {
    primary: toChoice(specs.primary),
    escalation: specs.escalation ? toChoice(specs.escalation) : undefined,
  };
}

/** What a finished answer produced, in the eval's shape. */
function _toEvalAnswer(
  reply: DataAgentReply,
  recorder: QuestionRecorder,
  startedAt: number,
): EvalAnswer {
  const lastQuery = reply.state.lastQuery;
  return {
    finalSql: lastQuery?.sql,
    vizType: recorder.vizType,
    result: recorder.result,
    error: lastQuery
      ? recorder.error
      : "Answered in text without running a query",
    assistantText: reply.text,
    clarifications: reply.state.questions.map((record) => {
      return {
        kind: record.kind === "values" ? "discovery" : "fixed_options",
        question: record.question,
        answer: record.answer,
        isAutomatic: record.isAutomatic,
      };
    }),
    consentPrompts: recorder.consentPrompts,
    valuesSentToModel: reply.state.valuesSentToModel,
    usage: {
      calls: reply.usage.calls,
      promptTokens: reply.usage.inputTokens,
      cachedPromptTokens: reply.usage.cachedInputTokens,
      completionTokens: reply.usage.outputTokens,
      reasoningTokens: reply.usage.reasoningTokens,
      cost: reply.usage.cost,
    },
    latencyMs: performance.now() - startedAt,
  };
}

/**
 * The usage of the model calls an answer made before it failed: the
 * assistant messages the agent recorded after `firstIndex`.
 */
function _usageSince(dataAgent: DataAgent, firstIndex: number): EvalUsage {
  const replies = dataAgent.agent.state.messages
    .slice(firstIndex)
    .filter((message): message is AssistantMessage => {
      return message.role === "assistant";
    });
  return replies.reduce<EvalUsage>((total, message) => {
    const usage = message.usage;
    return {
      calls: total.calls + 1,
      promptTokens:
        total.promptTokens + usage.input + usage.cacheRead + usage.cacheWrite,
      cachedPromptTokens: total.cachedPromptTokens + usage.cacheRead,
      completionTokens: total.completionTokens + usage.output,
      reasoningTokens: total.reasoningTokens + (usage.reasoning ?? 0),
      cost: total.cost + usage.cost.total,
    };
  }, EMPTY_EVAL_USAGE);
}

/**
 * A question whose answer failed on a model call (a rate limit or a server
 * error, for example). It grades as a miss, so one failed call does not end
 * the whole run.
 */
function _toFailedEvalAnswer(
  error: unknown,
  usage: EvalUsage,
  startedAt: number,
): EvalAnswer {
  return {
    error: error instanceof Error ? error.message : String(error),
    assistantText: "",
    clarifications: [],
    consentPrompts: 0,
    valuesSentToModel: [],
    usage,
    latencyMs: performance.now() - startedAt,
  };
}

function _buildPageBlock(question: EvalQuestion): string | undefined {
  return question.pageContext
    ? buildAgentPageContextBlock({
        context: question.pageContext,
        aliases: SqlTableAlias.fromDatasets(COVID_DATASETS),
        isSensitive: isPersonalDataText,
      })
    : undefined;
}

/**
 * One eval conversation with a data agent built by `createAgent` over a host
 * backed by DuckDB and the simulated user. A question whose model call
 * fails comes back as an answer with that error, not a rejection.
 */
export function createPiConversation(
  options: Readonly<{
    database: EvalDatabase;
    createAgent: (host: DataAgentHost) => DataAgent;
  }>,
): EvalConversation {
  const recorder: QuestionRecorder = { consentPrompts: 0 };
  let lastPageBlock: string | undefined;
  const dataAgent = options.createAgent(
    _createEvalHost(options.database, recorder),
  );
  return {
    ask: async (question) => {
      Object.assign(recorder, {
        question,
        result: undefined,
        error: undefined,
        vizType: undefined,
        consentPrompts: 0,
      });
      const startedAt = performance.now();
      const firstMessageIndex = dataAgent.agent.state.messages.length;
      const pageBlock = _buildPageBlock(question);
      try {
        const reply = await dataAgent.ask(
          buildAgentTurnText({
            message: question.prompt,
            pageBlock,
            previousPageBlock: lastPageBlock,
          }),
        );
        lastPageBlock = pageBlock ?? lastPageBlock;
        return _toEvalAnswer(reply, recorder, startedAt);
      } catch (error) {
        const usage = _usageSince(dataAgent, firstMessageIndex);
        return _toFailedEvalAnswer(error, usage, startedAt);
      }
    },
  };
}

/** Parses `id` or `id@thinking`, for a one-model config. */
function _parseModelSpec(text: string): PiEvalModelSpec {
  const [id, thinkingLevel] = text.split("@");
  return {
    id: id!,
    thinkingLevel: (thinkingLevel ?? "off") as PiEvalModelSpec["thinkingLevel"],
  };
}

/**
 * Creates the Pi-based harness: the browser data agent from
 * `src/lib/agent/dataAgent`, calling OpenRouter directly, with a host backed
 * by DuckDB and the simulated user.
 */
export function createPiHarness(
  options: Readonly<{
    openRouterApiKey: string;
    database: EvalDatabase;
    configName: string;
    model: string;
  }>,
): EvalHarness {
  const models = createModels();
  models.setProvider(openrouterProvider());
  const specs =
    options.configName === "single" || options.configName === "default"
      ? { primary: _parseModelSpec(options.model) }
      : PI_EVAL_CONFIGS[options.configName];
  if (!specs) {
    throw new Error(`Unknown Pi eval config "${options.configName}"`);
  }
  const policy = _createPolicy(models, specs);
  const streamFn: StreamFn = (model, context, streamOptions) => {
    return models.streamSimple(model, context, {
      ...streamOptions,
      apiKey: options.openRouterApiKey,
    });
  };
  const label =
    options.configName === "single" || options.configName === "default"
      ? `pi:${options.model}`
      : `pi:${options.configName}`;
  return {
    label,
    startConversation: () => {
      return createPiConversation({
        database: options.database,
        createAgent: (host) => {
          return createDataAgent({
            datasets: COVID_DATASETS,
            host,
            policy,
            streamFn,
            today: new Date().toISOString().slice(0, 10),
            sessionId: crypto.randomUUID(),
          });
        },
      });
    },
    close: async () => {},
  };
}
