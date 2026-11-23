import { DiscoveryCandidateValues } from "@/components/ChatPanel/ClarificationCard/DiscoveryCandidateValues/DiscoveryCandidateValues";
import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";
import { detectPii } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { reviewGeneratedSqlAssumptions } from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import { isSchemaAnswerTurn } from "@/lib/agent/schemaAnswer/isSchemaAnswerTurn";
import { COVID_WORKSPACE_SCHEMA } from "../../covid/covidWorkspace";
import { resolveEvalDiscovery } from "../../runtime/resolveEvalDiscovery";
import { runEvalSql } from "../../runtime/runEvalSql";
import { SimulatedUser } from "../../runtime/SimulatedUser";
import { addEvalUsage, EMPTY_EVAL_USAGE } from "../EvalHarness";
import { DenoChatTurnRunner } from "./DenoChatTurnRunner";
import type { EvalQuestion } from "../../EvalQuestion";
import type { EvalDatabase } from "../../runtime/EvalDatabase";
import type { SimulatedAnswer } from "../../runtime/SimulatedUser";
import type { EvalAnswer, EvalConversation, EvalHarness } from "../EvalHarness";
import type { DenoChatTurnResponse } from "./DenoChatTurnRunner";

const MAX_MODEL_TURNS_PER_QUESTION = 6;

const COPY = {
  rows: "I ran the query. Your results are ready.",
  empty: "I ran the query, but no data matched it.",
  failed: "I ran the query, but it failed.",
  dashboardOnly:
    "I can only add that to a dashboard. Open a dashboard and ask me again there.",
};

type ThreadMessage = { role: "user" | "assistant"; content: string };

type ExplorerContext = {
  app: "data-explorer";
  openDatasetId?: string;
  lastSql?: string;
  lastResultColumns?: Array<{ name: string; dataType: string }>;
  lastError?: string;
};

type Clarification = NonNullable<
  NonNullable<DenoChatTurnResponse["result"]>["clarification"]
>;

/**
 * Today's chat page context for a question whose screen is the Data
 * Explorer. Other screens leave the context as the conversation built it:
 * today's chat sees no tiles, maps, or case types.
 */
function _toExplorerContext(
  pageContext: NonNullable<EvalQuestion["pageContext"]>,
): ExplorerContext {
  const { dataset, explorer } = pageContext;
  return {
    app: "data-explorer",
    ...(dataset ? { openDatasetId: dataset.id } : {}),
    ...(explorer?.sql ? { lastSql: explorer.sql } : {}),
    ...(explorer?.resultColumns.length
      ? {
          lastResultColumns: explorer.resultColumns.map((column) => {
            return { ...column };
          }),
        }
      : {}),
  };
}

/** The reply text for applied SQL, as `applyChatTurnResponse` builds it. */
function _buildThreadText(
  assistantText: string,
  outcome: "rows" | "empty" | "failed",
): string {
  const prose = assistantText.replace(/```(?:sql)?[\s\S]*?```/gi, "").trim();
  if (prose.length === 0) {
    return COPY[outcome];
  }
  return outcome === "rows" ? prose : `${COPY[outcome]}\n\n${prose}`;
}

/** The SQL a response asks the explorer to run, with its chart type. */
function _getAppliedSql(
  result: NonNullable<DenoChatTurnResponse["result"]>,
): { sql: string; vizType?: string } | undefined {
  if (result.generatedSql?.sql) {
    return { sql: result.generatedSql.sql };
  }
  const block = result.dashboardBlock;
  if (block?.kind === "DataViz" && block.sql) {
    return { sql: block.sql, vizType: block.vizType };
  }
  return undefined;
}

function _needsConsent(values: readonly string[]): boolean {
  return (
    values.length > 0 && detectPii({ values: [...values] }).severity !== "clean"
  );
}

/**
 * The `chat` edge function as the app runs it today, with the Data Explorer's
 * client behavior played by the eval: lookups run locally, clarification cards
 * are answered by the simulated user, and SQL runs in DuckDB.
 */
class BaselineConversation implements EvalConversation {
  private readonly messages: ThreadMessage[] = [];
  private context: ExplorerContext = { app: "data-explorer" };

  constructor(
    private readonly runner: DenoChatTurnRunner,
    private readonly database: EvalDatabase,
    private readonly model: string,
  ) {}

  async ask(question: EvalQuestion): Promise<EvalAnswer> {
    const startedAt = performance.now();
    const answer: EvalAnswer = {
      assistantText: "",
      clarifications: [],
      consentPrompts: 0,
      valuesSentToModel: [],
      usage: EMPTY_EVAL_USAGE,
      latencyMs: 0,
    };
    if (question.pageContext?.app === "data-explorer") {
      this.context = _toExplorerContext(question.pageContext);
    }
    this.messages.push({ role: "user", content: question.prompt });
    for (let turn = 0; turn < MAX_MODEL_TURNS_PER_QUESTION; turn += 1) {
      const isDone = await this.runModelTurn(question, answer);
      if (isDone) {
        return { ...answer, latencyMs: performance.now() - startedAt };
      }
    }
    return {
      ...answer,
      error: "Too many model turns without an answer",
      latencyMs: performance.now() - startedAt,
    };
  }

  /**
   * Runs one model call and applies it. Returns true when the question is
   * answered.
   */
  private async runModelTurn(
    question: EvalQuestion,
    answer: EvalAnswer,
  ): Promise<boolean> {
    const response = await this.runner.runTurn({
      messages: this.messages,
      context: this.context,
      model: this.model,
      retryContext: undefined,
      schema: COVID_WORKSPACE_SCHEMA,
    });
    answer.usage = addEvalUsage(
      answer.usage,
      response.usage ?? EMPTY_EVAL_USAGE,
    );
    if (!response.result) {
      answer.error = `Chat request failed: ${response.error ?? "no response"}`;
      return true;
    }
    const appliedSql = _getAppliedSql(response.result);
    const userTexts = this.messages.flatMap((message) => {
      return message.role === "user" ? [message.content] : [];
    });
    if (appliedSql && isSchemaAnswerTurn(userTexts)) {
      const text = response.result.assistantText;
      this.messages.push({ role: "assistant", content: text });
      answer.assistantText = text;
      return true;
    }
    if (appliedSql) {
      await this.applySql(appliedSql, response.result.assistantText, answer);
      return true;
    }
    if (response.result.clarification) {
      this.messages.push({
        role: "assistant",
        content: response.result.assistantText,
      });
      await this.answerClarification(
        question,
        response.result.clarification,
        answer,
      );
      return false;
    }
    const text = response.result.dashboardBlock
      ? COPY.dashboardOnly
      : response.result.assistantText;
    this.messages.push({ role: "assistant", content: text });
    answer.assistantText = text;
    answer.error = "Answered in text without running a query";
    return true;
  }

  private async applySql(
    appliedSql: { sql: string; vizType?: string },
    assistantText: string,
    answer: EvalAnswer,
  ): Promise<void> {
    const review = reviewGeneratedSqlAssumptions({
      sql: appliedSql.sql,
      messages: this.messages,
    });
    answer.consentPrompts += review.needsApproval ? 1 : 0;
    const outcome = await runEvalSql(this.database, appliedSql.sql);
    const threadText = _buildThreadText(assistantText, outcome.kind);
    this.messages.push({ role: "assistant", content: threadText });
    answer.assistantText = threadText;
    answer.finalSql = appliedSql.sql;
    answer.vizType = appliedSql.vizType;
    if (outcome.kind === "failed") {
      answer.error = outcome.error;
      this.context = {
        app: "data-explorer",
        lastSql: appliedSql.sql,
        lastError: outcome.error,
      };
      return;
    }
    answer.result = outcome.result;
    this.context = {
      app: "data-explorer",
      lastSql: appliedSql.sql,
      lastResultColumns: outcome.result.columns.map((column) => {
        return { name: column.name, dataType: column.type };
      }),
    };
  }

  private async answerClarification(
    question: EvalQuestion,
    clarification: Clarification,
    answer: EvalAnswer,
  ): Promise<void> {
    const shape = clarification.responseShape;
    if (shape.kind === "discovery") {
      await this.answerDiscovery(question, clarification, answer);
      return;
    }
    const userAnswer: SimulatedAnswer =
      shape.kind === "fixed_options"
        ? SimulatedUser.answerOptions(shape.options, question.user)
        : { kind: "custom", text: SimulatedUser.answerFreeText(question.user) };
    this.recordUserAnswer(clarification, userAnswer, answer, false);
  }

  private async answerDiscovery(
    question: EvalQuestion,
    clarification: Clarification,
    answer: EvalAnswer,
  ): Promise<void> {
    const shape = clarification.responseShape;
    if (shape.kind !== "discovery") {
      return;
    }
    const candidateGroups = shape.candidateGroups ?? [];
    const resolved = await resolveEvalDiscovery(this.database, {
      query: shape.query,
      column: shape.column,
      candidateValues: [
        ...new Set([...shape.candidateValues, ...candidateGroups.flat()]),
      ],
    });
    const values = "values" in resolved ? resolved.values : [];
    const match = shape.multi
      ? DiscoveryCandidateValues.getGroupMatches({
          candidateGroups,
          discoveredValues: values,
        })
      : DiscoveryCandidateValues.getUniqueMatch({
          candidateValues: shape.candidateValues,
          discoveredValues: values,
        });
    if (match) {
      this.recordUserAnswer(
        clarification,
        { kind: "preset", value: match },
        answer,
        true,
      );
      return;
    }
    const userAnswer =
      values.length > 0
        ? SimulatedUser.pickValues(values, question.user, question.prompt)
        : {
            kind: "custom" as const,
            text: SimulatedUser.answerFreeText(question.user),
          };
    this.recordUserAnswer(clarification, userAnswer, answer, false);
  }

  private recordUserAnswer(
    clarification: Clarification,
    userAnswer: SimulatedAnswer,
    answer: EvalAnswer,
    isAutomatic: boolean,
  ): void {
    const threadText = SimulatedUser.toThreadText(userAnswer);
    const isDiscovery = clarification.responseShape.kind === "discovery";
    const sentValues =
      userAnswer.kind === "preset" && isDiscovery
        ? [userAnswer.value].flat()
        : [];
    answer.valuesSentToModel.push(...sentValues);
    answer.consentPrompts += _needsConsent(
      userAnswer.kind === "custom" ? [userAnswer.text] : sentValues,
    )
      ? 1
      : 0;
    answer.clarifications.push({
      kind: clarification.responseShape.kind,
      question: clarification.question,
      answer: threadText,
      isAutomatic,
    });
    this.messages.push({
      role: "user",
      content: isAutomatic
        ? DiscoveryContinuationMessage.toModelContent(threadText)
        : threadText,
    });
  }
}

/** Creates the baseline harness: today's `chat` edge function on one model. */
export function createBaselineHarness(
  options: Readonly<{
    repoRoot: string;
    openRouterApiKey: string;
    database: EvalDatabase;
    model: string;
  }>,
): EvalHarness {
  const runner = new DenoChatTurnRunner(options);
  return {
    label: `baseline:${options.model}`,
    startConversation: () => {
      return new BaselineConversation(runner, options.database, options.model);
    },
    close: async () => {
      runner.close();
    },
  };
}
