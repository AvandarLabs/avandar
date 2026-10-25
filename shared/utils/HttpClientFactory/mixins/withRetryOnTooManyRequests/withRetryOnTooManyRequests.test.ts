import { describe, expect, it, vi } from "vitest";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
import { withRetryOnTooManyRequests } from "$/utils/HttpClientFactory/mixins/withRetryOnTooManyRequests/withRetryOnTooManyRequests.ts";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

function _fetchAnswering(statuses: readonly number[]): FetchLike {
  let calls = 0;
  return vi.fn(async () => {
    const status = statuses[Math.min(calls, statuses.length - 1)] ?? 200;
    calls += 1;
    return new Response("{}", { status });
  });
}

function _client(fetchImpl: FetchLike, sleep: (ms: number) => Promise<void>) {
  return HttpClientFactory.create("Retrying", {
    state: { maxResponseBytes: 1000, fetchImpl },
    mixins: [
      withRetryOnTooManyRequests({
        maxRetries: 3,
        initialDelayMs: 5000,
        sleep,
      }),
    ],
  });
}

describe("withRetryOnTooManyRequests", () => {
  it("retries a 429 and returns the response that follows", async () => {
    const fetchImpl = _fetchAnswering([429, 200]);

    await expect(
      _client(fetchImpl, async () => {}).get("https://a.example/x"),
    ).resolves.toEqual({});
    expect(vi.mocked(fetchImpl).mock.calls.length).toBe(2);
  });

  it("waits 5, 10, then 20 seconds between retries, then gives up", async () => {
    const fetchImpl = _fetchAnswering([429]);
    const sleep = vi.fn(async () => {});

    await expect(
      _client(fetchImpl, sleep).get("https://a.example/x"),
    ).rejects.toThrow("status 429");
    expect([vi.mocked(fetchImpl).mock.calls.length, sleep.mock.calls]).toEqual([
      4,
      [[5000], [10000], [20000]],
    ]);
  });

  it("does not retry any other error status", async () => {
    const fetchImpl = _fetchAnswering([404]);
    const sleep = vi.fn(async () => {});

    await expect(
      _client(fetchImpl, sleep).get("https://a.example/x"),
    ).rejects.toThrow("status 404");
    expect([
      vi.mocked(fetchImpl).mock.calls.length,
      sleep.mock.calls.length,
    ]).toEqual([1, 0]);
  });
});
