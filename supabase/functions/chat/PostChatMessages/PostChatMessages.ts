import { Model } from "@avandar/models";
import { AvaModelSchema } from "@models/zod/index.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { emitChatTurnAnalytics } from "@sbfn/chat/PostChatMessages/analytics/emitChatTurnAnalytics/emitChatTurnAnalytics.ts";
import { verifyChatConsentAcks } from "@sbfn/chat/PostChatMessages/consent/verifyChatConsentAcks.ts";
import { enforceChatModelAllowlist } from "@sbfn/chat/PostChatMessages/enforceChatModelAllowlist/enforceChatModelAllowlist.ts";
import {
  countClarificationsInHistory,
  MAX_CLARIFICATIONS_PER_QUESTION,
} from "@sbfn/chat/PostChatMessages/parsing/parseClarify.ts";
import { dashboardBlockSummary } from "@sbfn/chat/PostChatMessages/parsing/parseDashboardBlock.ts";
import { unifiedSystemPrefix } from "@sbfn/chat/PostChatMessages/prompt/buildSystemPrompts.ts";
import { getLastUserPromptFromMessages } from "@sbfn/chat/PostChatMessages/prompt/getLastUserPromptFromMessages.ts";
import { makeChatToolConfigFromOptions } from "@sbfn/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts";
import { makeChatTurnSuffixFromOptions } from "@sbfn/chat/PostChatMessages/prompt/makeChatTurnSuffixFromOptions.ts";
import { runChatAttemptsWithEscalation } from "@sbfn/chat/PostChatMessages/runChatAttemptsWithEscalation/runChatAttemptsWithEscalation.ts";
import { fetchWorkspaceSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";
import { buildSqlSystemPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import { getAppURL } from "$/env/getAppURL.ts";
import { z } from "zod";
import type { ParsedAttempt } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");
if (!openRouterApiKey) {
  throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
}

const openRouterReferer = getAppURL();

export const PostChatMessages = POST({
  path: "/:workspaceId/messages",
  schema: {
    workspaceId: z.uuid(),
  },
})
  .bodySchema({
    messages: AvaModelSchema({
      type: "ChatClientMessage",
      props: {
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      },
    }).array(),
    context: AvaModelSchema({
      type: "ChatPageContext",
      props: {
        app: z.enum(["data-explorer", "data-sources", "dashboards", "other"]),
        openDatasetId: z.string().optional(),
        lastSql: z.string().optional(),
        lastResultColumns: z
          .array(z.object({ name: z.string(), dataType: z.string() }))
          .readonly()
          .optional(),
        lastError: z.string().optional(),
        dashboardId: z.string().optional(),
      },
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
  .action(
    async ({ pathParams, body, supabaseClient, supabaseAdminClient, user }) => {
      const { workspaceId } = pathParams;
      const {
        messages,
        context,
        model: requestedModel,
        consentAcks,
        retryContext,
      } = body;
      const model = enforceChatModelAllowlist(requestedModel);

      await verifyChatConsentAcks({
        consentAcks,
        messages,
        workspaceId,
        userId: user.id,
      });

      const schema = await fetchWorkspaceSchema({
        supabaseClient,
        workspaceId,
      });
      const lastUserPrompt = getLastUserPromptFromMessages(messages);
      const sqlSystemPrompt = buildSqlSystemPrompt({
        prompt: lastUserPrompt,
        datasets: schema.datasets,
        columns: schema.columns,
      });
      const systemContent = `${unifiedSystemPrefix}\n\n${sqlSystemPrompt}`;
      const turnSuffix = makeChatTurnSuffixFromOptions({
        context,
        retryContext,
        lastUserPrompt,
      });

      const priorClarifications = countClarificationsInHistory(messages);
      const clarificationCapReached =
        priorClarifications >= MAX_CLARIFICATIONS_PER_QUESTION;
      const requestBody: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: systemContent },
          ...messages,
          ...(turnSuffix ? [{ role: "user", content: turnSuffix }] : []),
        ],
        temperature: 0.3,
      };
      Object.assign(
        requestBody,
        makeChatToolConfigFromOptions({ clarificationCapReached }),
      );

      const turnStartedAt = performance.now();
      let parsed: ParsedAttempt;
      let attemptCount: number;
      try {
        ({ parsed, attemptCount } = await runChatAttemptsWithEscalation({
          requestBody,
          apiKey: openRouterApiKey,
          referer: openRouterReferer,
          lastUserPrompt,
          priorClarifications,
        }));
      } catch (error) {
        await emitChatTurnAnalytics({
          supabaseAdminClient,
          workspaceId,
          userId: user.id,
          pageApp: context.app,
          outcome: {
            kind: "failed",
            modelId: model,
            latencyMs: performance.now() - turnStartedAt,
            error,
          },
        });
        throw error;
      }

      const { text, generatedSql, clarification, dashboardBlock } = parsed;
      const assistantText = ((): string => {
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
          return dashboardBlockSummary(dashboardBlock);
        }
        return "I could not generate a query for that. Try rephrasing.";
      })();

      const result: ChatResponse.T = Model.make("ChatResponse", {
        assistantText,
        ...(generatedSql ? { generatedSql: generatedSql } : {}),
        ...(clarification ? { clarification } : {}),
        ...(dashboardBlock ? { dashboardBlock } : {}),
      });

      await emitChatTurnAnalytics({
        supabaseAdminClient,
        workspaceId,
        userId: user.id,
        pageApp: context.app,
        outcome: {
          kind: "completed",
          modelId: model,
          latencyMs: performance.now() - turnStartedAt,
          attemptCount,
          promptChars: lastUserPrompt.length,
          schemaDatasetCount: schema.datasets.length,
          assistantText,
          parsed,
        },
      });

      return result;
    },
  );
