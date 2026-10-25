import { createCrawlMetricsRecorder } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import { describe, expect, it } from "vitest";
import type { EtlClock } from "@etl/EtlEngine/EtlEngine.types";

/** A clock whose monotonic time moves `stepMs` each time it is read. */
function _tickingClock(stepMs: number): EtlClock {
  let elapsedMs = 0;
  return {
    now: () => {
      return new Date(Date.UTC(2026, 9, 22) + elapsedMs);
    },
    monotonicMs: () => {
      elapsedMs += stepMs;
      return elapsedMs;
    },
  };
}

const NO_CRAWL_COUNTS = {
  connectionsFetched: 0,
  relationsWritten: 0,
  relationsUnchanged: 0,
};

describe("createCrawlMetricsRecorder", () => {
  it("adds each timed stage's elapsed milliseconds to that stage", async () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(5));

    await metrics.time("extractMs", async () => {});
    await metrics.time("extractMs", async () => {});
    await metrics.time("loadWriteMs", async () => {});

    const { timings } = metrics.snapshot(NO_CRAWL_COUNTS);
    expect([timings.extractMs, timings.loadWriteMs, timings.setupMs]).toEqual([
      10, 5, 0,
    ]);
  });

  it("still times a stage whose work throws, and rethrows", async () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(5));

    await expect(
      metrics.time("transformMs", async () => {
        throw new Error("transform failed");
      }),
    ).rejects.toThrow("transform failed");

    expect(metrics.snapshot(NO_CRAWL_COUNTS).timings.transformMs).toBe(5);
  });

  it("counts denominators, the widest listing, and source sizes", () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(1));

    metrics.count("pageCount", 1);
    metrics.count("pageCount", 1);
    metrics.observeListingWidth(4);
    metrics.observeListingWidth(9);
    metrics.observeListingWidth(2);
    metrics.addSourceBytes(100);
    metrics.addSourceBytes(50);

    expect(metrics.snapshot(NO_CRAWL_COUNTS).denominators).toMatchObject({
      pageCount: 2,
      maxColumnsPerListing: 9,
      sourceBytesReported: 150,
    });
  });

  it("rounds each reported source size to whole bytes", () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(1));

    metrics.addSourceBytes(100.4);
    metrics.addSourceBytes(50.6);

    expect(
      metrics.snapshot(NO_CRAWL_COUNTS).denominators.sourceBytesReported,
    ).toBe(151);
  });

  it("leaves the source size unknown when nothing reported one", () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(1));

    expect(
      metrics.snapshot(NO_CRAWL_COUNTS).denominators.sourceBytesReported,
    ).toBe(undefined);
  });

  it("completes the denominators with the crawl's own counts", () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(1));

    expect(
      metrics.snapshot({
        connectionsFetched: 12,
        relationsWritten: 7,
        relationsUnchanged: 5,
      }).denominators,
    ).toMatchObject({
      datasetsFetched: 12,
      listingsWritten: 7,
      listingsUnchanged: 5,
    });
  });

  it("collects a pipeline's own counters and timers", async () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(3));

    metrics.pipelineMetrics.increment("hdx.parquet_footer_reads");
    metrics.pipelineMetrics.increment("hdx.parquet_footer_reads", 2);
    await metrics.pipelineMetrics.time(
      "hdx.parquet_footer_read_ms",
      async () => {},
    );

    expect(metrics.snapshot(NO_CRAWL_COUNTS).pipelineMetrics).toEqual({
      "hdx.parquet_footer_reads": 3,
      "hdx.parquet_footer_read_ms": 3,
    });
  });

  it("rounds fractional milliseconds, as the database stores whole ones", async () => {
    const metrics = createCrawlMetricsRecorder(_tickingClock(0.6));

    await metrics.time("extractMs", async () => {});

    expect(metrics.snapshot(NO_CRAWL_COUNTS).timings.extractMs).toBe(1);
  });
});
