import { Model } from "@avandar/models";
import {
  countClarificationsInHistory,
  MAX_CLARIFICATIONS_PER_QUESTION,
} from "@sbfn/chat/PostChatMessages/parsing/parseClarify.ts";
import { dashboardBlockSummary } from "@sbfn/chat/PostChatMessages/parsing/parseDashboardBlock.ts";
import { caseTypeDraftIntro } from "@sbfn/chat/PostChatMessages/parsing/parseProposeCaseType.ts";
import { annotateClarificationAnswersForModel } from "@sbfn/chat/PostChatMessages/prompt/annotateClarificationAnswersForModel.ts";
import { buildCaseManagerSystemPrompt } from "@sbfn/chat/PostChatMessages/prompt/buildCaseManagerSystemPrompt.ts";
import { unifiedSystemPrefix } from "@sbfn/chat/PostChatMessages/prompt/buildSystemPrompts.ts";
import { getLastUserPromptFromMessages } from "@sbfn/chat/PostChatMessages/prompt/getLastUserPromptFromMessages.ts";
import { makeChatToolConfigFromOptions } from "@sbfn/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts";
import { makeChatTurnSuffixFromOptions } from "@sbfn/chat/PostChatMessages/prompt/makeChatTurnSuffixFromOptions.ts";
import { runChatAttemptsWithEscalation } from "@sbfn/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts";
import { buildSqlSystemPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";
import type { ChatRetryContext } from "$/types/chat.types.ts";
import type { OpenRouterUsage } from "@sbfn/chat/PostChatMessages/openRouter/OpenRouterUsage.ts";
import type { ParsedAttempt } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
import type { WorkspaceChatSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";

/** Everything one chat turn needs, after auth, consent, and schema loading. */
export type RunChatTurnOptions = {
  messages: readonly ChatClientMessage.T[];
  context: ChatPageContext.T;
  model: string;
  retryContext: ChatRetryContext | undefined;
  schema: WorkspaceChatSchema;
  apiKey: string;
  referer: string;
};

function _buildSystemContent(
  options: Readonly<RunChatTurnOptions> & { lastUserPrompt: string },
): string {
  const { schema, context, lastUserPrompt } = options;
  if (context.app === "case-manager") {
    return buildCaseManagerSystemPrompt({
      datasets: schema.datasets,
      columns: schema.columns,
      concepts: schema.concepts,
    });
  }
  const sqlSystemPrompt = buildSqlSystemPrompt({
    prompt: lastUserPrompt,
    datasets: schema.datasets,
    columns: schema.columns,
    concepts: schema.concepts,
    conceptAttributes: schema.conceptAttributes,
    conceptStatuses: schema.conceptStatuses,
    includeSpatialDocumentation: false,
  });
  return `${unifiedSystemPrefix}\n\n${sqlSystemPrompt}`;
}

function _buildRequestBody(
  options: Readonly<RunChatTurnOptions> & {
    lastUserPrompt: string;
    clarificationCapReached: boolean;
  },
): Record<string, unknown> {
  const { context, retryContext, lastUserPrompt } = options;
  const turnSuffix =
    context.app === "case-manager"
      ? ""
      : makeChatTurnSuffixFromOptions({
          context,
          retryContext,
          lastUserPrompt,
        });
  return {
    model: options.model,
    messages: [
      { role: "system", content: _buildSystemContent(options) },
      ...annotateClarificationAnswersForModel(options.messages),
      ...(turnSuffix ? [{ role: "user", content: turnSuffix }] : []),
    ],
    temperature: 0.3,
    ...makeChatToolConfigFromOptions({
      clarificationCapReached: options.clarificationCapReached,
      app: context.app,
    }),
  };
}

function _buildAssistantText(
  parsed: ParsedAttempt,
  app: ChatPageContext.T["app"],
): string {
  const { text, generatedSql, clarification, dashboardBlock } = parsed;
  if (text) {
    return text;
  }
  if (generatedSql) {
    return "";
  }
  if (clarification) {
    return clarification.question;
  }
  if (dashboardBlock) {
    // Outside a dashboard the client shows the block another way (a chart
    // runs in the Data Explorer), so "added to your dashboard" would be
    // untrue there.
    return app === "dashboards" ? dashboardBlockSummary(dashboardBlock) : "";
  }
  if (parsed.createdCaseTypes && parsed.createdCaseTypes.length > 0) {
    return parsed.createdCaseTypes
      .map((caseType) => {
        return caseType.name;
      })
      .join(", ");
  }
  if (parsed.proposedCaseType) {
    return caseTypeDraftIntro(parsed.proposedCaseType.name);
  }
  return app === "case-manager"
    ? "I could not create those case types. Try choosing again or describing what you want."
    : "I could not generate a query for that. Try rephrasing.";
}

function _toChatResponse(
  parsed: ParsedAttempt,
  app: ChatPageContext.T["app"],
): ChatResponse.T {
  const { generatedSql, clarification, dashboardBlock } = parsed;
  return Model.make("ChatResponse", {
    assistantText: _buildAssistantText(parsed, app),
    ...(generatedSql ? { generatedSql: generatedSql } : {}),
    ...(clarification ? { clarification } : {}),
    ...(dashboardBlock ? { dashboardBlock } : {}),
    ...(parsed.createdCaseTypes
      ? { createdCaseTypes: parsed.createdCaseTypes }
      : {}),
    ...(parsed.proposedCaseType
      ? { proposedCaseType: parsed.proposedCaseType }
      : {}),
  });
}

/**
 * Runs one chat turn against a loaded workspace schema: builds the prompt and
 * tools for the page, calls OpenRouter (escalating on empty answers), and
 * turns the model's output into the response the client applies. Kept free of
 * auth and database access so the turn can also run outside the HTTP route,
 * for example in the AI harness eval.
 */
export async function runChatTurn(
  options: Readonly<RunChatTurnOptions>,
): Promise<{
  result: ChatResponse.T;
  parsed: ParsedAttempt;
  attemptCount: number;
  usage: OpenRouterUsage;
  lastUserPrompt: string;
}> {
  const lastUserPrompt = getLastUserPromptFromMessages(options.messages);
  const priorClarifications = countClarificationsInHistory(options.messages);
  const requestBody = _buildRequestBody({
    ...options,
    lastUserPrompt,
    clarificationCapReached:
      priorClarifications >= MAX_CLARIFICATIONS_PER_QUESTION,
  });
  const { parsed, attemptCount, usage } = await runChatAttemptsWithEscalation({
    requestBody,
    apiKey: options.apiKey,
    referer: options.referer,
    lastUserPrompt,
    priorClarifications,
    datasets: options.schema.datasets,
    concepts: options.schema.concepts,
    columns: options.schema.columns,
    skipSqlExtraction: options.context.app === "case-manager",
  });
  return {
    result: _toChatResponse(parsed, options.context.app),
    parsed,
    attemptCount,
    usage,
    lastUserPrompt,
  };
}
