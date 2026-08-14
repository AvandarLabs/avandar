import { FunctionsHttpError } from "@supabase/supabase-js";
import { createBrowserServerApiClient } from "$/ServerApiClient/createBrowserServerApiClient.ts";
import {
  ServerApiSessionRefresher,
  SessionExpiredError,
} from "$/ServerApiClient/ServerApiSessionRefresher.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDbClient } = vi.hoisted(() => {
  return {
    fakeDbClient: {
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
      auth: { refreshSession: vi.fn() },
    } as unknown as {
      functions: { invoke: ReturnType<typeof vi.fn> };
      auth: { refreshSession: ReturnType<typeof vi.fn> };
    },
  };
});

vi.mock("$/db/supabase/AvaSupabase.ts", () => {
  return {
    AvaSupabase: {
      db: () => {
        return fakeDbClient;
      },
    },
  };
});

function unauthorized() {
  return {
    data: null,
    error: new FunctionsHttpError(new Response(null, { status: 401 })),
  };
}

function ok<T>(data: T) {
  return { data, error: null };
}

function refreshedSession() {
  return {
    data: { session: { access_token: "fresh" }, user: {} },
    error: null,
  };
}

function refreshFailed() {
  return { data: { session: null, user: null }, error: new Error("no token") };
}

describe("createBrowserServerApiClient invokeFunction 401 handling", () => {
  beforeEach(() => {
    ServerApiSessionRefresher.setOnExpired(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
    ServerApiSessionRefresher.setOnExpired(undefined);
  });

  it("returns data without refreshing when the call succeeds", async () => {
    fakeDbClient.functions.invoke.mockResolvedValueOnce(ok({ ok: true }));
    const client = createBrowserServerApiClient();

    const result = await client.invokeFunction({
      route: "fake/route",
      method: "GET",
    });

    expect(result).toEqual({ ok: true });
    expect(fakeDbClient.auth.refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes once and retries on a 401, then returns the retried data", async () => {
    fakeDbClient.functions.invoke
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(ok({ ok: true }));
    fakeDbClient.auth.refreshSession.mockResolvedValueOnce(refreshedSession());
    const client = createBrowserServerApiClient();

    const result = await client.invokeFunction({
      route: "fake/route",
      method: "GET",
    });

    expect(result).toEqual({ ok: true });
    expect(fakeDbClient.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(fakeDbClient.functions.invoke).toHaveBeenCalledTimes(2);
  });

  it("throws SessionExpiredError and fires the handler once when refresh fails", async () => {
    fakeDbClient.functions.invoke.mockResolvedValueOnce(unauthorized());
    fakeDbClient.auth.refreshSession.mockResolvedValueOnce(refreshFailed());
    const onExpired = vi.fn();
    ServerApiSessionRefresher.setOnExpired(onExpired);
    const client = createBrowserServerApiClient();

    await expect(
      client.invokeFunction({
        route: "support/featurebase-jwt",
        method: "GET",
      }),
    ).rejects.toBeInstanceOf(SessionExpiredError);
    expect(onExpired).toHaveBeenCalledTimes(1);
    // No retry happened because there was no fresh session.
    expect(fakeDbClient.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it("throws SessionExpiredError when the retry is still a 401", async () => {
    fakeDbClient.functions.invoke
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized());
    fakeDbClient.auth.refreshSession.mockResolvedValueOnce(refreshedSession());
    const client = createBrowserServerApiClient();

    await expect(
      client.invokeFunction({ route: "fake/route", method: "GET" }),
    ).rejects.toBeInstanceOf(SessionExpiredError);
    // Retried exactly once; did not loop.
    expect(fakeDbClient.functions.invoke).toHaveBeenCalledTimes(2);
    expect(fakeDbClient.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on a non-401 error", async () => {
    fakeDbClient.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: new FunctionsHttpError(new Response(null, { status: 500 })),
    });
    const client = createBrowserServerApiClient();

    await expect(
      client.invokeFunction({ route: "fake/route", method: "GET" }),
    ).rejects.toThrow(/failed/);
    expect(fakeDbClient.auth.refreshSession).not.toHaveBeenCalled();
  });

  it("shares a single refresh across concurrent 401s", async () => {
    // Both initial calls 401; both retries succeed. The refresh must run once.
    fakeDbClient.functions.invoke
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(ok({ n: 1 }))
      .mockResolvedValueOnce(ok({ n: 2 }));
    let resolveRefresh: (
      v: ReturnType<typeof refreshedSession>,
    ) => void = () => {};
    fakeDbClient.auth.refreshSession.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const client = createBrowserServerApiClient();

    const p1 = client.invokeFunction({ route: "fake/route", method: "GET" });
    const p2 = client.invokeFunction({
      route: "support/featurebase-jwt",
      method: "GET",
    });
    // Let both hit their 401 and await the shared refresh before it resolves.
    await Promise.resolve();
    resolveRefresh(refreshedSession());

    await Promise.all([p1, p2]);
    expect(fakeDbClient.auth.refreshSession).toHaveBeenCalledTimes(1);
  });
});
