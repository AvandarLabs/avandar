import { AvaModelSchema } from "@models/zod/index.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { emitChatTurnAnalytics } from "@sbfn/chat/PostChatMessages/analytics/emitChatTurnAnalytics/emitChatTurnAnalytics.ts";
import { verifyChatConsentAcks } from "@sbfn/chat/PostChatMessages/consent/verifyChatConsentAcks.ts";
import { runChatTurn } from "@sbfn/chat/PostChatMessages/runChatTurn/runChatTurn.ts";
import { fetchWorkspaceSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";
import { z } from "zod";
import { getAppURL } from "$/env/getAppURL.ts";
import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption.ts";

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
        app: z.enum([
          "data-explorer",
          "data-sources",
          "dashboards",
          "case-manager",
          "other",
        ]),
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
    // Accepted so older clients that still send a picked model keep working,
    // and ignored: Avandar chooses the model for every chat turn.
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
      const { messages, context, consentAcks, retryContext } = body;
      const model = ChatModelOption.Catalog.defaultId;

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

      const turnStartedAt = performance.now();
      let turn: Awaited<ReturnType<typeof runChatTurn>>;
      try {
        turn = await runChatTurn({
          messages,
          context,
          model,
          retryContext,
          schema,
          apiKey: openRouterApiKey,
          referer: openRouterReferer,
        });
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

      await emitChatTurnAnalytics({
        supabaseAdminClient,
        workspaceId,
        userId: user.id,
        pageApp: context.app,
        outcome: {
          kind: "completed",
          modelId: model,
          latencyMs: performance.now() - turnStartedAt,
          attemptCount: turn.attemptCount,
          promptChars: turn.lastUserPrompt.length,
          schemaDatasetCount: schema.datasets.length,
          assistantText: turn.result.assistantText,
          parsed: turn.parsed,
        },
      });

      return turn.result;
    },
  );
