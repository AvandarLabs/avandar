import { PipelineRunReportSchema } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";
import { describe, expect, it } from "vitest";

/** A report shaped like `@avandar/etl`'s `EtlRunReport`, with real dates. */
const ENGINE_REPORT = {
  pipelineRunId: "00000000-0000-4000-8000-000000000001",
  mode: "incremental",
  drives: [
    {
      driveKey: "https://data.cityofnewyork.us",
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
      report.drives[0]?.window,
      report.drives[0]?.newestTimestamp,
    ]).toEqual([
      { since: "2026-10-01T00:00:00.000Z" },
      "2026-10-20T12:00:00.000Z",
    ]);
  });

  it("rejects a timestamp that is not ISO 8601", () => {
    const report = JSON.parse(JSON.stringify(ENGINE_REPORT));
    report.drives[0].newestTimestamp = "yesterday";

    expect(PipelineRunReportSchema.safeParse(report).success).toBe(false);
  });
});
