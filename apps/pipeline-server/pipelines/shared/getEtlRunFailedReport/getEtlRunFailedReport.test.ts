import { EtlRunFailedError } from "@avandar/etl";
import { getEtlRunFailedReport } from "@pipelines/shared/getEtlRunFailedReport/getEtlRunFailedReport";
import { describe, expect, it } from "vitest";
import type { EtlPipelineRunId, EtlRunReport } from "@avandar/etl";

const REPORT: EtlRunReport = {
  pipelineRunId: "00000000-0000-4000-8000-000000000001" as EtlPipelineRunId,
  mode: "full",
  crawls: [],
};

describe("getEtlRunFailedReport", () => {
  it("returns the report an EtlRunFailedError carries", () => {
    const error = new EtlRunFailedError({ report: REPORT, errors: [] });

    expect(getEtlRunFailedReport(error)).toBe(REPORT);
  });

  it("matches by name, so a copy of the class from another load still counts", () => {
    const error = Object.assign(new Error("Every crawl failed."), {
      name: "EtlRunFailedError",
      report: REPORT,
    });

    expect(getEtlRunFailedReport(error)).toBe(REPORT);
  });

  it("returns undefined for any other error", () => {
    const error = Object.assign(new Error("Source is down."), {
      report: REPORT,
    });

    expect(getEtlRunFailedReport(error)).toBe(undefined);
  });
});
