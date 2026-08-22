import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/**
 * The emitter is what makes `analytics.chat_health` non-empty. It must record
 * exactly one row per turn, must never let an analytics failure surface to the
 * user, and must classify a failed turn without the attempt ever completing.
 */
import { emitChatTurnAnalytics } from "@sbfn/chat/PostChatMessages/analytics/emitChatTurnAnalytics/emitChatTurnAnalytics.ts";
import { describe, expect, it, vi } from "vitest";

function _createFakeClient(): {
  client: AvaSupabaseClient;
  insert: ReturnType<typeof vi.fn>;
} {
  const insert = vi.fn(() => {
    return {
      throwOnError: vi.fn(async () => {
        return { error: null };
      }),
    };
  });
  return {
    client: {
      from: vi.fn(() => {
        return { insert };
      }),
    } as unknown as AvaSupabaseClient,
    insert,
  };
}

describe("emitChatTurnAnalytics", () => {
  it("records a completed turn against the workspace and user", async () => {
    const fake = _createFakeClient();

    await emitChatTurnAnalytics({
      supabaseAdminClient: fake.client,
      workspaceId: "ws-1",
      userId: "user-1",
      pageApp: "data-explorer",
      outcome: {
        kind: "completed",
        modelId: "openai/gpt-4o-mini",
        latencyMs: 1200,
        attemptCount: 2,
        promptChars: 12,
        schemaDatasetCount: 4,
        assistantText: "ok",
        parsed: {
          text: "",
          generatedSql: { sql: "SELECT 1", prompt: "count the rows" },
        },
      },
    });

    expect(fake.insert).toHaveBeenCalledTimes(1);
    expect(fake.insert.mock.calls[0]?.[0]).toMatchObject({
      event_name: "chat.turn_completed",
      workspace_id: "ws-1",
      user_id: "user-1",
      app: "data_explorer",
      client: "server",
    });
    expect(fake.insert.mock.calls[0]?.[0]?.payload).toMatchObject({
      outcome: "sql",
      attemptCount: 2,
      latencyMs: 1200,
    });
  });

  it("records a failed turn", async () => {
    const fake = _createFakeClient();

    await emitChatTurnAnalytics({
      supabaseAdminClient: fake.client,
      workspaceId: "ws-1",
      userId: "user-1",
      pageApp: "dashboards",
      outcome: {
        kind: "failed",
        modelId: "openai/gpt-4o-mini",
        latencyMs: 300,
        error: new Error("OpenRouter API error: 500"),
      },
    });

    expect(fake.insert.mock.calls[0]?.[0]).toMatchObject({
      event_name: "chat.turn_failed",
      app: "dashboards",
    });
    expect(fake.insert.mock.calls[0]?.[0]?.payload).toMatchObject({
      errorClass: "upstream_error",
    });
  });

  it("leaves the app null on the generic surface, which has no app_type value", async () => {
    const fake = _createFakeClient();

    await emitChatTurnAnalytics({
      supabaseAdminClient: fake.client,
      workspaceId: "ws-1",
      userId: "user-1",
      pageApp: "other",
      outcome: {
        kind: "failed",
        modelId: "m",
        latencyMs: 1,
        error: new Error("x"),
      },
    });

    expect(fake.insert.mock.calls[0]?.[0]?.app).toBeNull();
  });
});
