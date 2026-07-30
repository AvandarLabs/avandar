import { Model } from "@models/Model/Model.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { verifyChatConsentAcks } from "@sbfn/chat/PostChatMessages/consent/verifyChatConsentAcks.ts";
import { runOpenRouterAttempt } from "@sbfn/chat/PostChatMessages/openRouter/runOpenRouterAttempt.ts";
import {
  countClarificationsInHistory,
  MAX_CLARIFICATIONS_PER_QUESTION,
  parseClarify,
} from "@sbfn/chat/PostChatMessages/parsing/parseClarify.ts";
import { dashboardBlockSummary } from "@sbfn/chat/PostChatMessages/parsing/parseDashboardBlock.ts";
import {
  isEmptyParsedAttempt,
  parseOpenRouterResponse,
} from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
import {
  buildChatToolConfig,
  buildRetryContextNote,
  dashboardsSystemPrefix,
  dataExplorerSystemPrefix,
  genericSystemPrompt,
} from "@sbfn/chat/PostChatMessages/prompt/buildSystemPrompts.ts";
import { fetchWorkspaceSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";
import { buildSqlSystemPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import { AppConfig } from "$/config/AppConfig.ts";
import { getAppURL } from "$/env/getAppURL.ts";
import { modelSchema } from "$/lib/zodHelpers.ts";
import { z } from "zod";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");
if (!openRouterApiKey) {
  throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
}

const openRouterReferer = getAppURL();

/** Matches OpenRouter model ids such as `openai/gpt-4o-mini`. */
const OPENROUTER_MODEL_ID_PATTERN = /^[a-z0-9-]+\/[a-z0-9._-]+$/i;

function _resolveChatModel(model: string | undefined): string {
  if (model && OPENROUTER_MODEL_ID_PATTERN.test(model)) {
    return model;
  }
  return AppConfig.chat.defaultModelId;
}

// Cheap heuristic for "this prompt is a refinement of the previous turn."
// When it matches AND the client gave us a `lastSql`, we attach the prior
// SQL to the system prompt so the model can edit it instead of rebuilding
// from scratch. The brief calls for "prior prompt + SQL only when relevant"
// to keep token spend honest; this regex is the relevance gate.
const REFINEMENT_HINTS =
  /^\s*(now|instead|also|actually|and|but|wait)\b|\b(it|that|this query|this one|the result|the previous|same|earlier|again|now also|drop|add|clean|remove)\b/i;

export const PostChatMessages = POST({
  path: "/:workspaceId/messages",
  schema: {
    workspaceId: z.uuid(),
  },
})
  .bodySchema({
    messages: modelSchema("ChatClientMessage", {
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    }).array(),
    context: modelSchema("ChatPageContext", {
      app: z.enum(["data-explorer", "data-sources", "dashboards", "other"]),
      openDatasetId: z.string().optional(),
      lastSql: z.string().optional(),
      lastResultColumns: z
        .array(z.object({ name: z.string(), dataType: z.string() }))
        .readonly()
        .optional(),
      lastError: z.string().optional(),
      dashboardId: z.string().optional(),
    }),
    model: z.string().optional(),
    consentAcks: z
      .array(
        z.object({
          ackToken: z.string(),
          scope: z.union([
            z.object({
              kind: z.literal("message_index"),
              index: z.number().int().nonnegative(),
            }),
            z.object({
              kind: z.literal("values"),
              sourceColumn: z.string().optional(),
            }),
          ]),
        }),
      )
      .optional(),
    retryContext: z
      .object({
        priorAssistantText: z.string().max(2000).optional(),
        priorGeneratedSql: z.string().max(8000).optional(),
        priorClarificationQuestion: z.string().max(400).optional(),
        priorDashboardBlockKind: z.string().max(40).optional(),
      })
      .optional(),
  })
  .action(async ({ pathParams, body, supabaseClient, user }) => {
    const { workspaceId } = pathParams;
    const {
      messages,
      context,
      model: requestedModel,
      consentAcks,
      retryContext,
    } = body;
    const model = _resolveChatModel(requestedModel);

    await verifyChatConsentAcks({
      consentAcks,
      messages,
      workspaceId,
      userId: user.id,
    });

    const isDataExplorer = context.app === "data-explorer";
    const isDashboards = context.app === "dashboards";
    const needsSchema = isDataExplorer || isDashboards;

    // Only fetch the schema when we'll actually use it.
    const schema =
      needsSchema ?
        await fetchWorkspaceSchema({ supabaseClient, workspaceId })
      : { datasets: [], columns: [] };

    const lastUserPrompt =
      [...messages].reverse().find((m) => {
        return m.role === "user";
      })?.content ?? "";

    const sqlSystemPrompt =
      needsSchema ?
        buildSqlSystemPrompt({
          prompt: lastUserPrompt,
          datasets: schema.datasets,
          columns: schema.columns,
        })
      : "";

    const hasLastSql =
      typeof context.lastSql === "string" && context.lastSql.length > 0;

    const isLikelyRefinement =
      isDataExplorer && hasLastSql && REFINEMENT_HINTS.test(lastUserPrompt);

    const refinementContext =
      isLikelyRefinement && hasLastSql ?
        `\n\nThe user's previous turn produced this SQL, and the current message looks like a refinement of it. When generating SQL, edit this prior query rather than starting over.\n\nPrevious SQL:\n\`\`\`sql\n${context.lastSql}\n\`\`\``
      : "";

    // When the prior SQL produced a runtime error and the client passed
    // it back, surface it so the model can fix the query in this turn.
    const errorContext =
      isDataExplorer && hasLastSql && context.lastError ?
        `\n\nThe previous SQL failed at runtime with this error. Use the error to fix the query.\n\nPrevious SQL:\n\`\`\`sql\n${context.lastSql}\n\`\`\`\n\nError:\n${context.lastError}`
      : "";

    // Tell the model the *current* result schema the user is looking at.
    // After manual SQL edits or pill swaps the user-visible columns can
    // diverge from the dataset schemas, so this is the source of truth
    // for "what's on the canvas right now."
    const resultColumnsContext =
      (
        isDataExplorer &&
        context.lastResultColumns &&
        context.lastResultColumns.length > 0
      ) ?
        `\n\nThe user is currently looking at a result with these columns:\n${context.lastResultColumns
          .map((c) => {
            return `- ${c.name} (${c.dataType})`;
          })
          .join(
            "\n",
          )}\n\nWhen answering or generating new SQL, treat this as the live result schema.`
      : "";

    const retryContextNote = buildRetryContextNote(retryContext);

    const systemContent =
      (isDataExplorer ?
        `${dataExplorerSystemPrefix}\n\n${sqlSystemPrompt}${refinementContext}${errorContext}${resultColumnsContext}`
      : isDashboards ? `${dashboardsSystemPrefix}\n\n${sqlSystemPrompt}`
      : genericSystemPrompt) + retryContextNote;

    const requestBody: Record<string, unknown> = {
      model,
      messages: [{ role: "system", content: systemContent }, ...messages],
      temperature: 0.3,
    };

    const priorClarifications = countClarificationsInHistory(messages);
    const clarificationCapReached =
      priorClarifications >= MAX_CLARIFICATIONS_PER_QUESTION;
    Object.assign(
      requestBody,
      buildChatToolConfig({
        isDataExplorer,
        isDashboards,
        clarificationCapReached,
      }),
    );

    // Single OpenRouter attempt, wrapped in a helper so the
    // retry-on-empty escalation below can re-call it with different
    // params. Throws on non-2xx so the outer handler surfaces it.
    const runAttempt = (attemptRequestBody: Record<string, unknown>) => {
      return runOpenRouterAttempt({
        requestBody: attemptRequestBody,
        apiKey: openRouterApiKey,
        referer: openRouterReferer,
      });
    };

    // Attempt 1: normal call.
    let attempt = await runAttempt(requestBody);
    let parsed = parseOpenRouterResponse({
      message: attempt.message,
      attemptText: attempt.text,
      isDataExplorer,
      isDashboards,
      lastUserPrompt,
      priorClarifications,
    });

    // Attempt 2 (only when attempt 1 returned nothing): literal repeat
    // with a bumped temperature so we get a meaningfully different
    // draw rather than the same emptiness twice.
    if (isEmptyParsedAttempt(parsed)) {
      attempt = await runAttempt({ ...requestBody, temperature: 0.5 });
      parsed = parseOpenRouterResponse({
        message: attempt.message,
        attemptText: attempt.text,
        isDataExplorer,
        isDashboards,
        lastUserPrompt,
        priorClarifications,
      });
    }

    // Attempt 3 (only when attempts 1 and 2 returned nothing): force
    // the model into one of the registered tools. Skipped on the
    // generic surface where the request has no tools to pick from.
    const hasTools =
      Array.isArray(requestBody.tools) &&
      (requestBody.tools as unknown[]).length > 0;
    if (isEmptyParsedAttempt(parsed) && hasTools) {
      attempt = await runAttempt({
        ...requestBody,
        temperature: 0.5,
        tool_choice: "required",
      });
      parsed = parseOpenRouterResponse({
        message: attempt.message,
        attemptText: attempt.text,
        isDataExplorer,
        isDashboards,
        lastUserPrompt,
        priorClarifications,
      });
    }

    const { text, generatedSql, clarification, dashboardBlock } = parsed;

    const assistantText =
      text ||
      (generatedSql ?
        "Here is the SQL I ran. Results are on the canvas to the left."
      : clarification ? clarification.question
      : dashboardBlock ? dashboardBlockSummary(dashboardBlock)
      : "I could not generate a query for that. Try rephrasing.");

    const result: ChatResponse.T = Model.make("ChatResponse", {
      assistantText,
      ...(generatedSql ? { generatedSql: generatedSql } : {}),
      ...(clarification ? { clarification } : {}),
      ...(dashboardBlock ? { dashboardBlock } : {}),
    });
    return result;
  });
