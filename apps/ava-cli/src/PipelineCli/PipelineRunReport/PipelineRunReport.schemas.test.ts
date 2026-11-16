import { PipelineRunReportSchema } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import { describe, expect, it } from "vitest";

/** A report shaped like `@avandar/etl`'s `EtlRunReport`, with real dates. */
const ENGINE_REPORT = {
  pipelineRunId: "00000000-0000-4000-8000-000000000001",
  mode: "incremental",
  crawls: [
    {
      driveKey: "https://data.cityofnewyork.us",
      scopeKey: "all",
      window: {
        since: new Date("2026-10-01T00:00:00Z"),
        until: undefined,
      },
      connectionsFetched: 2,
      relationsWritten: 1,
      relationsUnchanged: 1,
      newestTimestamp: new Date("2026-10-20T12:00:00Z"),
      status: "ok",
    },
  ],
};

describe("PipelineRunReportSchema", () => {
  it("reads an engine report's dates back as ISO 8601 strings after JSON", () => {
    const report = PipelineRunReportSchema.parse(
      JSON.parse(JSON.stringify(ENGINE_REPORT)),
    );

    expect([
      report.crawls[0]?.window,
      report.crawls[0]?.newestTimestamp,
    ]).toEqual([
      { since: "2026-10-01T00:00:00.000Z" },
      "2026-10-20T12:00:00.000Z",
    ]);
  });

  it("rejects a timestamp that is not ISO 8601", () => {
    const report = JSON.parse(JSON.stringify(ENGINE_REPORT));
    report.crawls[0].newestTimestamp = "yesterday";

    expect(PipelineRunReportSchema.safeParse(report).success).toBe(false);
  });
  it("accepts a mode and a drive status it does not know", () => {
    const report = JSON.parse(JSON.stringify(ENGINE_REPORT));
    report.mode = "backfill";
    report.crawls[0].status = "paused";

    expect(PipelineRunReportSchema.safeParse(report).success).toBe(true);
  });

  it("rejects a crawl with no scope key", () => {
    const report = JSON.parse(JSON.stringify(ENGINE_REPORT));
    delete report.crawls[0].scopeKey;

    expect(PipelineRunReportSchema.safeParse(report).success).toBe(false);
  });

  it("reads the run's and each crawl's times when sent, and a report without them", () => {
    const timed = PipelineRunReportSchema.parse(
      JSON.parse(
        JSON.stringify({
          ...ENGINE_REPORT,
          startedAt: new Date("2026-10-22T10:00:00Z"),
          finishedAt: new Date("2026-10-22T10:00:05Z"),
          setupMs: 120,
          crawls: [
            {
              ...ENGINE_REPORT.crawls[0],
              startedAt: new Date("2026-10-22T10:00:00Z"),
              finishedAt: new Date("2026-10-22T10:00:04Z"),
            },
          ],
        }),
      ),
    );

    expect([
      timed.setupMs,
      timed.finishedAt,
      timed.crawls[0]?.startedAt,
      PipelineRunReportSchema.safeParse(
        JSON.parse(JSON.stringify(ENGINE_REPORT)),
      ).success,
    ]).toEqual([
      120,
      "2026-10-22T10:00:05.000Z",
      "2026-10-22T10:00:00.000Z",
      true,
    ]);
  });
});
