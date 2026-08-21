import { logAnalyticsEvent } from "@sbfn/_shared/analytics/logAnalyticsEvent/logAnalyticsEvent.ts";
import { ChatTurnAnalyticsPayloads } from "@sbfn/chat/PostChatMessages/analytics/ChatTurnAnalyticsPayloads/ChatTurnAnalyticsPayloads.ts";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";
import type { ParsedAttempt } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
import type { AnalyticsApp } from "$/analytics/AnalyticsEvents/AnalyticsEvents.types.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";

/** What a turn ended up being, and the facts only the server knows about it. */
type ChatTurnOutcomeRecord =
  | {
      kind: "completed";
      modelId: string;
      latencyMs: number;
      attemptCount: number;
      promptChars: number;
      schemaDatasetCount: number;
      assistantText: string;
      parsed: ParsedAttempt;
    }
  | {
      kind: "failed";
      modelId: string;
      latencyMs: number;
      error: unknown;
    };

/**
 * The chat page context uses hyphenated surface names while the database enum
 * uses underscores, and the generic surface has no enum value at all.
 *
 * A `switch` rather than `matchLiteral`, which the repo prefers elsewhere:
 * `undefined` is not a member of `ValidMatchedValues`, so mapping the generic
 * surface to it would need every arm wrapped in a thunk with `as const`.
 * `noImplicitReturns` gives this the same exhaustiveness, and deleting a case
 * is still a compile error.
 */
function _getAnalyticsAppFromPageApp(
  pageApp: ChatPageContext.ChatApp,
): AnalyticsApp | undefined {
  switch (pageApp) {
    case "data-explorer":
      return "data_explorer";
    case "data-sources":
      return "data_sources";
    case "dashboards":
      return "dashboards";
    case "case-manager":
      return undefined;
    case "other":
      return undefined;
  }
}

/**
 * Records one chat turn. Never throws: `logAnalyticsEvent` swallows its own
 * failures, and a turn that a user already paid for must not fail because a
 * telemetry row could not be written.
 *
 * Only failures of the OpenRouter request itself are recorded. Consent
 * verification, the model allowlist, and the schema fetch all run before the
 * caller starts timing, so `analytics.chat_health` measures provider
 * reliability rather than end-to-end turn reliability.
 */
export async function emitChatTurnAnalytics(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseClient;
    workspaceId: string;
    userId: string;
    pageApp: ChatPageContext.ChatApp;
    outcome: ChatTurnOutcomeRecord;
  }>,
): Promise<void> {
  const { supabaseAdminClient, workspaceId, userId, pageApp, outcome } =
    options;
  const app = _getAnalyticsAppFromPageApp(pageApp);

  if (outcome.kind === "failed") {
    await logAnalyticsEvent({
      supabaseAdminClient,
      workspaceId,
      userId,
      app,
      event: "chat.turn_failed",
      payload: ChatTurnAnalyticsPayloads.fromFailedTurn({
        modelId: outcome.modelId,
        latencyMs: outcome.latencyMs,
        error: outcome.error,
      }),
    });
    return;
  }

  await logAnalyticsEvent({
    supabaseAdminClient,
    workspaceId,
    userId,
    app,
    event: "chat.turn_completed",
    payload: ChatTurnAnalyticsPayloads.fromCompletedTurn({
      modelId: outcome.modelId,
      latencyMs: outcome.latencyMs,
      attemptCount: outcome.attemptCount,
      promptChars: outcome.promptChars,
      schemaDatasetCount: outcome.schemaDatasetCount,
      assistantText: outcome.assistantText,
      parsed: outcome.parsed,
    }),
  });
}
