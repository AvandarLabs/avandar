import { logAnalyticsEvent } from "@sbfn/_shared/analytics/logAnalyticsEvent/logAnalyticsEvent.ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type FakeClient = {
  client: AvaSupabaseClient;
  from: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  throwOnError: ReturnType<typeof vi.fn>;
};

function _createFakeClient(
  options: Readonly<{ insertError?: Error; rejection?: Error }> = {},
): FakeClient {
  const response = Promise.resolve({ error: options.insertError ?? null });
  const throwOnError = vi.fn(async () => {
    if (options.rejection) {
      throw options.rejection;
    }

    const result = await response;
    if (result.error) {
      throw result.error;
    }
    return result;
  });
  const insert = vi.fn((_analyticsRow: unknown) => {
    return { then: response.then.bind(response), throwOnError };
  });
  const from = vi.fn(() => {
    return { insert };
  });

  return {
    client: { from } as unknown as AvaSupabaseClient,
    from,
    insert,
    throwOnError,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logAnalyticsEvent", () => {
  it("stamps the row as server-emitted with no app version", async () => {
    const fakeClient = _createFakeClient();

    await logAnalyticsEvent({
      supabaseAdminClient: fakeClient.client,
      event: "chat.turn_completed",
      workspaceId: "ws-1",
      userId: "user-1",
      app: "data_explorer",
      payload: { modelId: "openai/gpt-4o-mini" } as never,
    });

    expect(fakeClient.from).toHaveBeenCalledWith("usage_analytics_events");
    expect(fakeClient.insert).toHaveBeenCalledWith({
      event_name: "chat.turn_completed",
      workspace_id: "ws-1",
      user_id: "user-1",
      app: "data_explorer",
      payload: { modelId: "openai/gpt-4o-mini" },
      client: "server",
      app_version: null,
    });
    expect(fakeClient.throwOnError).toHaveBeenCalledOnce();
  });

  it("defaults every optional field to null", async () => {
    const fakeClient = _createFakeClient();

    await logAnalyticsEvent({
      supabaseAdminClient: fakeClient.client,
      event: "waitlist.code_verified",
    });

    expect(fakeClient.insert).toHaveBeenCalledWith({
      event_name: "waitlist.code_verified",
      workspace_id: null,
      user_id: null,
      app: null,
      payload: null,
      client: "server",
      app_version: null,
    });
  });

  it("does not send an event category", async () => {
    const fakeClient = _createFakeClient();

    await logAnalyticsEvent({
      supabaseAdminClient: fakeClient.client,
      event: "dashboard.public_viewed",
    });

    expect(fakeClient.insert).toHaveBeenCalledOnce();
    const insertedRow = fakeClient.insert.mock.calls[0]?.[0];
    expect(insertedRow).not.toHaveProperty("event_category");
  });

  it("never throws when Supabase resolves an insert error", async () => {
    const insertError = new Error("insert failed");
    const fakeClient = _createFakeClient({ insertError });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      logAnalyticsEvent({
        supabaseAdminClient: fakeClient.client,
        event: "chat.turn_failed",
      }),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "[analytics] failed to log event",
      "chat.turn_failed",
      insertError,
    );
  });

  it("never throws when the insert request rejects", async () => {
    const rejection = new Error("insert exploded");
    const fakeClient = _createFakeClient({ rejection });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      logAnalyticsEvent({
        supabaseAdminClient: fakeClient.client,
        event: "chat.turn_failed",
      }),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      "[analytics] failed to log event",
      "chat.turn_failed",
      rejection,
    );
  });
});
