import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { detectPii } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { COVID_DATASETS } from "../../covid/covidWorkspace";
import { runEvalSql } from "../../runtime/runEvalSql";
import { SimulatedUser } from "../../runtime/SimulatedUser";
import { PI_EVAL_CONFIGS } from "./piEvalConfigs";
import type { EvalQuestion } from "../../EvalQuestion";
import type { EvalDatabase, EvalQueryResult } from "../../runtime/EvalDatabase";
import type { EvalAnswer, EvalConversation, EvalHarness } from "../EvalHarness";
import type { PiEvalModelSpec } from "./piEvalConfigs";
import type { DataAgentModelPolicy } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type {
  DataAgentHost,
  DataAgentUserAnswer,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { StreamFn } from "@earendil-works/pi-agent-core";

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

function _createConversation(
  options: Readonly<{
    database: EvalDatabase;
    policy: DataAgentModelPolicy;
    streamFn: StreamFn;
  }>,
): EvalConversation {
  const recorder: QuestionRecorder = { consentPrompts: 0 };
  const dataAgent = createDataAgent({
    datasets: COVID_DATASETS,
    host: _createEvalHost(options.database, recorder),
    policy: options.policy,
    streamFn: options.streamFn,
    today: new Date().toISOString().slice(0, 10),
    sessionId: crypto.randomUUID(),
  });
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
      const reply = await dataAgent.ask(question.prompt);
      const lastQuery = reply.state.lastQuery;
      const answer: EvalAnswer = {
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
      return answer;
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
      return _createConversation({
        database: options.database,
        policy,
        streamFn,
      });
    },
    close: async () => {},
  };
}
