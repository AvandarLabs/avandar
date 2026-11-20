import { omit } from "@avandar/utils";
import { createModels } from "@earendil-works/pi-ai/models";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { getAgentGadgetName } from "$/agent/mentions/AgentGadgetContext";
import {
  buildAgentContextBlocks,
  buildAgentGadgetModelName,
} from "$/agent/mentions/buildAgentContextBlocks";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { buildAgentTurnText } from "$/agent/pageContext/buildAgentTurnText";
import { omitEmptyPageBlock } from "$/agent/pageContext/omitEmptyPageBlock/omitEmptyPageBlock";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias";
import {
  detectPii,
  isPersonalDataText,
} from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { resolveAgentDashboardTarget } from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import { OFFLINE_SQL_TILE_BUDGET } from "@/lib/agent/dataAgent/offline/offlineContextBudget";
import { createPlaceholderRestoringHost } from "@/lib/agent/dataAgent/pagePrivacy/createPlaceholderRestoringHost";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
import { COVID_DATASETS } from "../../covid/covidWorkspace";
import { runEvalSql } from "../../runtime/runEvalSql";
import { SimulatedUser } from "../../runtime/SimulatedUser";
import { addEvalUsage, EMPTY_EVAL_USAGE } from "../EvalHarness";
import {
  getEvalPluginAiTools,
  publishFitRegressionResult,
  runEvalPluginAiTool,
} from "./fitRegressionTooling";
import { PI_EVAL_CONFIGS } from "./piEvalConfigs";
import type { DataAgentDataset } from "$/agent/dataAgent/buildDataAgentSystemPrompt";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { AgentContextBlocks } from "$/agent/mentions/buildAgentContextBlocks";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { EvalQuestion } from "../../EvalQuestion";
import type { EvalDatabase, EvalQueryResult } from "../../runtime/EvalDatabase";
import type {
  EvalAnswer,
  EvalConversation,
  EvalDashboardWrite,
  EvalHarness,
  EvalUsage,
} from "../EvalHarness";
import type { PiEvalDefaultPage, PiEvalModelSpec } from "./piEvalConfigs";
import type {
  DataAgent,
  DataAgentModelPolicy,
  DataAgentReply,
} from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import type {
  AgentDashboardCandidate,
  AgentDashboardTarget,
} from "@/lib/agent/dataAgent/dashboards/resolveAgentDashboardTarget";
import type {
  DataAgentDashboardBlockOutcome,
  DataAgentHost,
  DataAgentQueryOutcome,
  DataAgentUserAnswer,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { SqlLiteralDetectors } from "@/lib/agent/dataAgent/pagePrivacy/findSensitiveSqlLiterals";
import type { SqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import type { AssistantMessage } from "@earendil-works/pi-ai";

/** Every COVID dataset column name, lowercased, for the page SQL check. */
const COVID_COLUMN_NAMES: ReadonlySet<string> = new Set(
  COVID_DATASETS.flatMap((dataset) => {
    return dataset.columns.map((column) => {
      return column.name.toLowerCase();
    });
  }),
);

/**
 * How a conversation's page context reaches the model. `hosted` redacts SQL
 * and masks names. `device` builds blocks as the app's offline turn does:
 * real names, nothing redacted, three charts of SQL.
 */
type PiConversationPrivacy = "hosted" | "device";

/** One turn's context blocks, and how a mention token is named. */
type TurnInputs = {
  blocks: AgentContextBlocks;
  nameOf: (ref: Gadget.Ref) => string;
};

type QuestionRecorder = {
  question?: EvalQuestion;
  result?: EvalQueryResult;
  error?: string;
  vizType?: string;
  consentPrompts: number;
  dashboardWrites: EvalDashboardWrite[];
  /**
   * The next card stays on screen, unanswered, so the agent's turn ends
   * there, as in the browser. Set for the first attempt of a Try again
   * question that leaves its first card unanswered.
   */
  isNextCardDeferred: boolean;
};

function _toUserAnswer(
  answer: ReturnType<typeof SimulatedUser.answerOptions>,
): DataAgentUserAnswer {
  return answer.kind === "custom"
    ? { kind: "typed", text: answer.text }
    : { kind: "picked", values: [answer.value].flat() };
}

/** The dashboard the question's page shows, as a candidate. */
function _pageDashboardOf(
  question: EvalQuestion | undefined,
): AgentDashboardCandidate | undefined {
  const dashboard = question?.pageContext?.dashboard;
  return dashboard ? { id: dashboard.id, name: dashboard.name } : undefined;
}

/** The question's mentioned, then attached, dashboards. */
function _contextDashboardsOf(
  question: EvalQuestion | undefined,
): AgentDashboardCandidate[] {
  return [...(question?.mentions ?? []), ...(question?.attached ?? [])].flatMap(
    (context) => {
      return context.kind === "dashboard"
        ? [{ id: context.ref.gadgetId, name: context.name }]
        : [];
    },
  );
}

/** A DataViz block's result in DuckDB, as the editor would run it. */
async function _runBlockSql(
  database: EvalDatabase,
  block: ChatGeneratedDashboardBlock,
): Promise<Pick<EvalDashboardWrite, "result" | "error">> {
  if (block.kind !== "DataViz") {
    return {};
  }
  const outcome = await runEvalSql(database, block.sql);
  return outcome.kind === "failed"
    ? { error: outcome.error }
    : { result: outcome.result };
}

/**
 * Plays the target the way the browser does: the open editor takes the
 * block, and a card is answered at once by the question's script (confirm
 * by default, picking `pickDashboardId` when several dashboards match). A
 * confirmed card on the dashboard open in the editor goes there, as in
 * the app.
 */
async function _placeEvalBlock(
  options: Readonly<{
    database: EvalDatabase;
    recorder: QuestionRecorder;
    target: AgentDashboardTarget;
    block: ChatGeneratedDashboardBlock;
  }>,
): Promise<DataAgentDashboardBlockOutcome> {
  const { target, recorder } = options;
  if (target.kind !== "editor" && target.kind !== "card") {
    return target;
  }
  const script = recorder.question?.card ?? { action: "confirm" };
  const picked =
    target.kind === "editor"
      ? target.dashboardId
      : (target.candidates.find((candidate) => {
          return candidate.id === script.pickDashboardId;
        }) ?? target.candidates[0])!.id;
  const isEditor = picked === recorder.question?.openEditorDashboardId;
  if (target.kind === "card" && script.action === "cancel") {
    return { kind: "card_shown" };
  }
  recorder.dashboardWrites.push({
    dashboardId: picked,
    via: isEditor ? "editor" : "card",
    block: options.block,
    ...(await _runBlockSql(options.database, options.block)),
  });
  return { kind: target.kind === "editor" ? "added_to_editor" : "card_shown" };
}

/** A recorder with nothing recorded yet, for `question`. */
function _startQuestion(question: EvalQuestion | undefined): QuestionRecorder {
  return {
    question,
    result: undefined,
    error: undefined,
    vizType: undefined,
    consentPrompts: 0,
    dashboardWrites: [],
    isNextCardDeferred: false,
  };
}

/** A dashboard chart's SQL run for its shape only, never its rows. */
async function _checkEvalQuery(
  database: EvalDatabase,
  sql: string,
): Promise<DataAgentQueryOutcome> {
  const outcome = await runEvalSql(database, sql);
  return outcome.kind === "failed"
    ? outcome
    : {
        kind: outcome.kind,
        columns: outcome.result.columns,
        rowCount: outcome.result.rows.length,
      };
}

/** Resolves the named dashboard from the question's page, then places. */
async function _addEvalDashboardBlock(
  database: EvalDatabase,
  recorder: QuestionRecorder,
  request: Readonly<{ dashboard: string; block: ChatGeneratedDashboardBlock }>,
): Promise<DataAgentDashboardBlockOutcome> {
  const question = recorder.question;
  const dashboards = question?.dashboards ?? [];
  const target = await resolveAgentDashboardTarget({
    requested: request.dashboard,
    openEditorDashboardId: question?.openEditorDashboardId,
    pageDashboard: _pageDashboardOf(question),
    contextDashboards: _contextDashboardsOf(question),
    loadWorkspaceDashboards: async () => {
      return dashboards;
    },
    canEdit: async (dashboardId) => {
      return dashboards.some((dashboard) => {
        return dashboard.id === dashboardId && dashboard.canEdit;
      });
    },
  });
  return _placeEvalBlock({ database, recorder, target, block: request.block });
}

/** Runs the agent's query in DuckDB and records its result for grading. */
async function _showEvalQuery(
  database: EvalDatabase,
  recorder: QuestionRecorder,
  request: Parameters<DataAgentHost["showQuery"]>[0],
): Promise<DataAgentQueryOutcome> {
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
}

/** The simulated user's answer to a card, or a card left on screen. */
function _answerEvalCard(
  options: Readonly<{
    recorder: QuestionRecorder;
    request: Parameters<DataAgentHost["askUser"]>[0];
  }>,
): DataAgentUserAnswer {
  const { recorder, request } = options;
  if (recorder.isNextCardDeferred) {
    recorder.isNextCardDeferred = false;
    return { kind: "deferred" };
  }
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
}

/** The data agent's host in the eval: DuckDB in Node and a simulated user. */
function _createEvalHost(
  database: EvalDatabase,
  recorder: QuestionRecorder,
): DataAgentHost {
  return {
    showQuery: async (request) => {
      return _showEvalQuery(database, recorder, request);
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
      return _answerEvalCard({ recorder, request });
    },
    checkQuery: async (sql) => {
      return _checkEvalQuery(database, sql);
    },
    addDashboardBlock: async (request) => {
      return _addEvalDashboardBlock(database, recorder, request);
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

/** What the eval records when the agent could not build a chart. */
const CHART_NOT_BUILT_TEXT =
  "I couldn't build that chart. Its query kept failing.";

/** What a finished answer produced, in the eval's shape. */
function _toEvalAnswer(
  reply: DataAgentReply,
  recorder: QuestionRecorder,
  startedAt: number,
  toolNames: readonly string[],
): EvalAnswer {
  const lastQuery = reply.state.lastQuery;
  return {
    finalSql: lastQuery?.sql,
    vizType: recorder.vizType,
    result: recorder.result,
    error: lastQuery
      ? recorder.error
      : recorder.dashboardWrites.length > 0
        ? undefined
        : "Answered in text without running a query",
    assistantText:
      reply.failure === "chart_not_built" ? CHART_NOT_BUILT_TEXT : reply.text,
    clarifications: reply.state.questions.map((record) => {
      return {
        kind: record.kind === "values" ? "discovery" : "fixed_options",
        question: record.question,
        answer: record.answer,
        isAutomatic: record.isAutomatic,
      };
    }),
    consentPrompts: recorder.consentPrompts,
    dashboardWrites: [...recorder.dashboardWrites],
    valuesSentToModel: reply.state.valuesSentToModel,
    toolNames,
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
  toolNames: readonly string[],
): EvalAnswer {
  return {
    error: error instanceof Error ? error.message : String(error),
    assistantText: "",
    clarifications: [],
    consentPrompts: 0,
    valuesSentToModel: [],
    toolNames,
    usage,
    latencyMs: performance.now() - startedAt,
  };
}

/** The names of the tools the model called after message `firstIndex`. */
function _toolNamesSince(
  dataAgent: DataAgent,
  firstIndex: number,
): readonly string[] {
  return dataAgent.agent.state.messages
    .slice(firstIndex)
    .filter((message): message is AssistantMessage => {
      return message.role === "assistant";
    })
    .flatMap((message) => {
      return message.content.flatMap((block) => {
        return block.type === "toolCall" ? [block.name] : [];
      });
    });
}

/** Which SQL literals are personal for the question, as the app sees. */
function _createDetectors(question: EvalQuestion): SqlLiteralDetectors {
  const personalColumns = new Set(question.personalColumns ?? []);
  return {
    isSensitiveColumn: (columnName) => {
      return (
        personalColumns.has(columnName) || isPersonalColumnName(columnName)
      );
    },
    isSensitiveValue: isPersonalDataText,
    knownColumnNames: COVID_COLUMN_NAMES,
  };
}

/** A ref's context from the question, or unavailable when it has none. */
function _createContextLookup(
  question: EvalQuestion,
): (ref: Gadget.Ref) => AgentGadgetContext {
  const known = new Map(
    [...(question.attached ?? []), ...(question.mentions ?? [])].map(
      (context) => {
        return [ChatMentionToken.buildRefKey(context.ref), context] as const;
      },
    ),
  );
  return (ref) => {
    return (
      known.get(ChatMentionToken.buildRefKey(ref)) ?? {
        kind: "unavailable",
        ref,
      }
    );
  };
}

/**
 * The turn's blocks and mention names as the browser builds them: every
 * piece of SQL is redacted through the conversation's vault in one pass,
 * then names are masked with the same vault. A column is personal when its
 * name looks personal, when the question lists it, or when it is none of
 * the COVID datasets' columns (an alias). A mention the question gives no
 * context for is unavailable. Unlike the browser, it does not redact the SQL
 * of gadgets only earlier messages mention: no eval follow-up mentions a
 * gadget its parent did not also have in scope, so the vault never lacks a
 * value a later name needs. With `device` privacy it skips redaction and
 * masking: SQL and names stay real, and SQL is capped at three charts.
 */
function _buildTurnInputs(
  question: EvalQuestion,
  vault: SqlPlaceholderVault,
  privacy: PiConversationPrivacy,
): TurnInputs {
  const detectors = _createDetectors(question);
  const toContext = _createContextLookup(question);
  const isHosted = privacy === "hosted";
  const blocks = buildAgentContextBlocks({
    page: question.pageContext,
    attached: question.attached ?? [],
    mentioned: ChatMentionToken.refsFromText(question.prompt).map(toContext),
    aliases: SqlTableAlias.fromDatasets(COVID_DATASETS),
    isSensitive: isPersonalDataText,
    redactSql: isHosted
      ? (sql) => {
          return vault.redact(sql, detectors);
        }
      : undefined,
    maskText: isHosted ? vault.maskText : undefined,
    maxSqlTiles: isHosted ? undefined : OFFLINE_SQL_TILE_BUDGET,
  });
  const nameOf = (ref: Gadget.Ref): string => {
    const context = toContext(ref);
    return isHosted
      ? buildAgentGadgetModelName(context, {
          isSensitive: isPersonalDataText,
          mask: vault.maskText,
        })
      : getAgentGadgetName(context);
  };
  return { blocks, nameOf };
}

/**
 * Runs `ask` with the question's fit rows published as the Data Explorer's
 * result, when it has any, and clears them once it settles.
 */
async function _withFitRegressionResult<T>(
  question: EvalQuestion,
  ask: () => Promise<T>,
): Promise<T> {
  if (!question.fitRegression) {
    return ask();
  }
  publishFitRegressionResult(question.fitRegression);
  try {
    return await ask();
  } finally {
    ExplorerPluginResultStore.clear();
  }
}

/** What one eval conversation keeps between its questions. */
type PiConversationState = {
  dataAgent: DataAgent;
  recorder: QuestionRecorder;
  vault: SqlPlaceholderVault;
  privacy: PiConversationPrivacy;
  defaultPage?: PiEvalDefaultPage;
  /** The query and columns the default page's Data Explorer shows. */
  explorer?: AgentPageContext["explorer"];
  lastPageBlock?: string;
  lastAttachedBlock?: string;
  /**
   * Whether the last ask resolved, as the app records its last ask. Only a
   * Try again after a kept reply carries the Try again line.
   */
  isLastAskKept: boolean;
};

/**
 * The question with the conversation's default page on screen when it sets
 * none, as the app always sends a page block. The Data Explorer shows the
 * last answer's query and result columns, as it does after a real answer.
 */
function _withDefaultPage(
  question: EvalQuestion,
  state: Readonly<PiConversationState>,
): EvalQuestion {
  if (question.pageContext || state.defaultPage === undefined) {
    return question;
  }
  return {
    ...question,
    pageContext: {
      app: state.defaultPage,
      explorer: state.explorer ?? { resultColumns: [] },
    },
  };
}

/** What the Data Explorer shows after an answer, when it ran a query. */
function _readExplorerFromAnswer(
  answer: EvalAnswer,
): AgentPageContext["explorer"] {
  if (!answer.finalSql || !answer.result) {
    return undefined;
  }
  return {
    sql: answer.finalSql,
    resultColumns: answer.result.columns.map((column) => {
      return { name: column.name, dataType: column.type.toLowerCase() };
    }),
  };
}

/**
 * The page block a turn sends. A device conversation leaves out an empty
 * Data Explorer's, as the app's device turns do, and a hosted one always
 * sends it.
 */
function _getPageBlockToSend(
  state: Readonly<PiConversationState>,
  blocks: AgentContextBlocks,
): string | undefined {
  return state.privacy === "device"
    ? omitEmptyPageBlock({
        pageBlock: blocks.pageBlock,
        previousPageBlock: state.lastPageBlock,
      })
    : blocks.pageBlock;
}

/** How one attempt at a question is asked. */
type PiAttempt = {
  /** A Try again: a hosted conversation's turn text carries the line. */
  isRetry: boolean;
  /** The attempt's first card stays on screen, unanswered. */
  isFirstCardDeferred: boolean;
};

/** An ordinary question's only attempt. */
const ONLY_ATTEMPT: PiAttempt = { isRetry: false, isFirstCardDeferred: false };

/** Asks one question in the conversation and records how it went. */
async function _askPiQuestion(
  state: PiConversationState,
  question: EvalQuestion,
  attempt: Readonly<PiAttempt> = ONLY_ATTEMPT,
): Promise<EvalAnswer> {
  const { dataAgent, recorder } = state;
  const shown = _withDefaultPage(question, state);
  Object.assign(recorder, _startQuestion(shown));
  recorder.isNextCardDeferred = attempt.isFirstCardDeferred;
  const startedAt = performance.now();
  const firstMessageIndex = dataAgent.agent.state.messages.length;
  const inputs = _buildTurnInputs(shown, state.vault, state.privacy);
  const pageBlock = _getPageBlockToSend(state, inputs.blocks);
  try {
    const reply = await dataAgent.ask(
      buildAgentTurnText({
        message: ChatMentionToken.toModelText(shown.prompt, inputs.nameOf),
        pageBlock,
        previousPageBlock: state.lastPageBlock,
        attachedBlock: inputs.blocks.attachedBlock,
        previousAttachedBlock: state.lastAttachedBlock,
        mentionedBlock: inputs.blocks.mentionedBlock,
        isRetry: attempt.isRetry && state.privacy === "hosted",
      }),
    );
    state.isLastAskKept = true;
    state.lastPageBlock = pageBlock ?? state.lastPageBlock;
    state.lastAttachedBlock = inputs.blocks.attachedBlock;
    const toolNames = _toolNamesSince(dataAgent, firstMessageIndex);
    const answer = _toEvalAnswer(reply, recorder, startedAt, toolNames);
    state.explorer = _readExplorerFromAnswer(answer) ?? state.explorer;
    return answer;
  } catch (error) {
    state.isLastAskKept = false;
    const usage = _usageSince(dataAgent, firstMessageIndex);
    const toolNames = _toolNamesSince(dataAgent, firstMessageIndex);
    return _toFailedEvalAnswer(error, usage, startedAt, toolNames);
  }
}

/**
 * Asks a Try again question: the question, then the same message again on
 * the same conversation, as a Try again. A hosted conversation's second
 * turn carries the Try again line when the first attempt's reply was kept,
 * and a device one's never does. The page block is built as for any turn,
 * so the Data Explorer shows the first attempt's query. Returns the second
 * attempt, with the first beside it.
 */
async function _askPiTryAgain(
  state: PiConversationState,
  question: EvalQuestion,
): Promise<EvalAnswer> {
  const firstAttempt = await _askPiQuestion(state, question, {
    isRetry: false,
    isFirstCardDeferred: question.tryAgain?.isFirstCardUnanswered === true,
  });
  const secondAttempt = await _askPiQuestion(state, question, {
    isRetry: state.isLastAskKept,
    isFirstCardDeferred: false,
  });
  return {
    ...secondAttempt,
    // The question cost both attempts. Its latency stays the second
    // attempt's: the wait after the user clicks Try again.
    usage: addEvalUsage(firstAttempt.usage, secondAttempt.usage),
    firstAttempt: omit(firstAttempt, ["result", "firstAttempt"]),
  };
}

/**
 * One eval conversation with a data agent built by `createAgent` over a host
 * backed by DuckDB and the simulated user. Like the browser, it keeps one
 * placeholder vault per conversation and restores placeholders before SQL
 * runs. A question whose model call fails comes back as an answer with that
 * error, not a rejection.
 */
export function createPiConversation(
  options: Readonly<{
    database: EvalDatabase;
    createAgent: (host: DataAgentHost) => DataAgent;
    /**
     * `device` builds blocks as the app's offline turn does: real names,
     * nothing redacted, three charts of SQL. Defaults to `hosted`.
     */
    privacy?: PiConversationPrivacy;
    /**
     * The page on screen for every question that sets none, so a question
     * with no page of its own is sent the page block the app always sends.
     * Unset sends a question that sets no page no page block.
     */
    defaultPage?: PiEvalDefaultPage;
  }>,
): EvalConversation {
  const recorder: QuestionRecorder = _startQuestion(undefined);
  const vault = createSqlPlaceholderVault();
  const state: PiConversationState = {
    recorder,
    vault,
    privacy: options.privacy ?? "hosted",
    defaultPage: options.defaultPage,
    isLastAskKept: false,
    dataAgent: options.createAgent(
      createPlaceholderRestoringHost(
        _createEvalHost(options.database, recorder),
        vault,
      ),
    ),
  };
  return {
    ask: (question) => {
      return _withFitRegressionResult(question, () => {
        return question.tryAgain
          ? _askPiTryAgain(state, question)
          : _askPiQuestion(state, question);
      });
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

/** What `createPiHarness` needs to call OpenRouter and read the data. */
type CreatePiHarnessOptions = {
  openRouterApiKey: string;
  database: EvalDatabase;
  configName: string;
  model: string;
  /** The workspace's datasets as the agent sees them. COVID by default. */
  datasets?: readonly DataAgentDataset[];
  /** The page on screen for questions that set none. None by default. */
  defaultPage?: PiEvalDefaultPage;
};

/**
 * Creates the Pi-based harness: the browser data agent from
 * `src/lib/agent/dataAgent`, calling OpenRouter directly, with a host backed
 * by DuckDB and the simulated user.
 */
export function createPiHarness(
  options: Readonly<CreatePiHarnessOptions>,
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
        defaultPage: options.defaultPage,
        createAgent: (host) => {
          return createDataAgent({
            datasets: options.datasets ?? COVID_DATASETS,
            host,
            policy,
            streamFn,
            today: new Date().toISOString().slice(0, 10),
            sessionId: crypto.randomUUID(),
            getPluginAiTools: getEvalPluginAiTools,
            runPluginAiTool: runEvalPluginAiTool,
          });
        },
      });
    },
    close: async () => {},
  };
}
