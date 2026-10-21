import { readPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/readPipelineRunReport";
import { describe, expect, it } from "vitest";

const REPORT = {
  pipelineRunId: "00000000-0000-4000-8000-000000000001",
  mode: "full",
  crawls: [],
};

describe("readPipelineRunReport", () => {
  it("returns a report that matches the schema", () => {
    expect(readPipelineRunReport(REPORT)).toEqual({
      isReadable: true,
      report: REPORT,
    });
  });

  it("returns the raw JSON of a value that is not a report", () => {
    expect(readPipelineRunReport({ pipelineRunId: 5 })).toEqual({
      isReadable: false,
      json: '{"pipelineRunId":5}',
    });
  });
});
