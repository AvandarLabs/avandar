import { createModule } from "@avandar/modules";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory.ts";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit.ts";
import type { FetchLike } from "$/utils/HttpClientFactory/HttpClientFactory.types.ts";

const MIN_TIME_MS = 50;

/**
 * Records the fake clock reading each time the client actually sends a
 * request, so a spacing check reads virtual time and never wall-clock time.
 */
function _recordingFetch(): { fetchImpl: FetchLike; startTimes: number[] } {
  const startTimes: number[] = [];
  const fetchImpl: FetchLike = vi.fn(async () => {
    startTimes.push(Date.now());
    return new Response("{}", { status: 200 });
  });
  return { fetchImpl, startTimes };
}

function _gaps(times: readonly number[]): number[] {
  return times.slice(1).map((time, index) => {
    return time - (times[index] ?? time);
  });
}

/**
 * Drives the fake clock until the limiter has released every request, then
 * returns what the requests resolved to.
 */
async function _settle<TResult>(pending: Promise<TResult>): Promise<TResult> {
  await vi.runAllTimersAsync();
  return pending;
}

describe("withRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("spaces the start of consecutive requests by at least minTimeMs", async () => {
    const { fetchImpl, startTimes } = _recordingFetch();
    const client = HttpClientFactory.create("Limited", {
      state: { maxResponseBytes: 1000, fetchImpl },
      mixins: [withRateLimit({ minTimeMs: MIN_TIME_MS })],
    });
    await _settle(
      Promise.all([
        client.get("https://a.example/1"),
        client.get("https://a.example/2"),
        client.get("https://a.example/3"),
      ]),
    );
    expect(startTimes).toHaveLength(3);
    _gaps(startTimes).forEach((gap) => {
      expect(gap).toBeGreaterThanOrEqual(MIN_TIME_MS);
    });
  });

  it("sends requests in the order they were made", async () => {
    const { fetchImpl } = _recordingFetch();
    const client = HttpClientFactory.create("Limited", {
      state: { maxResponseBytes: 1000, fetchImpl },
      mixins: [withRateLimit({ minTimeMs: 5 })],
    });
    await _settle(
      Promise.all(
        ["1", "2", "3"].map((path) => {
          return client.get(`https://a.example/${path}`);
        }),
      ),
    );
    expect(
      vi.mocked(fetchImpl).mock.calls.map((call) => {
        return call[0];
      }),
    ).toEqual([
      "https://a.example/1",
      "https://a.example/2",
      "https://a.example/3",
    ]);
  });

  it("shares one limiter between a client and a client derived from it by a setter", async () => {
    const { fetchImpl, startTimes } = _recordingFetch();
    const client = HttpClientFactory.create("Limited", {
      state: { maxResponseBytes: 1000, fetchImpl },
      mixins: [withRateLimit({ minTimeMs: MIN_TIME_MS })],
    });
    const derived = client.setBaseUrl("https://b.example");
    await _settle(
      Promise.all([client.get("https://a.example/1"), derived.get("/2")]),
    );
    expect(startTimes).toHaveLength(2);
    expect(_gaps(startTimes)[0]).toBeGreaterThanOrEqual(MIN_TIME_MS);
  });

  it("gives clients from separate withRateLimit calls separate limiters", async () => {
    const { fetchImpl, startTimes } = _recordingFetch();
    const create = (name: string) => {
      return HttpClientFactory.create(name, {
        state: { maxResponseBytes: 1000, fetchImpl },
        mixins: [withRateLimit({ minTimeMs: 1000 })],
      });
    };
    await _settle(
      Promise.all([
        create("First").get("https://a.example/1"),
        create("Second").get("https://a.example/2"),
      ]),
    );
    expect(startTimes).toHaveLength(2);
    expect(_gaps(startTimes)[0]).toBe(0);
  });

  it("refuses a module without a middlewares state", () => {
    expect(() => {
      // @ts-expect-error - the module has no getMiddlewares accessor
      createModule("NotAnHttpClient").mixin(withRateLimit({ minTimeMs: 1 }));
    }).toThrow();
  });
});
