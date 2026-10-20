import { printPipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/printPipelineRunReport";
import { Acclimate } from "@avandar/acclimate";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";

const DRIVE = {
  driveKey: "https://data.cityofnewyork.us",
  window: { since: "2026-10-01T00:00:00.000Z" },
  connectionsFetched: 120,
  relationsWritten: 3,
  relationsUnchanged: 117,
  newestTimestamp: "2026-10-20T12:00:00.000Z",
  status: "ok",
} as const;

function _report(drives: PipelineRunReport["drives"]): PipelineRunReport {
  return {
    pipelineRunId: "00000000-0000-4000-8000-000000000001",
    mode: "incremental",
    drives,
  };
}

function _logs(): string {
  const calls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return calls.flat().join("\n");
}

describe("printPipelineRunReport", () => {
  beforeEach(() => {
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  it("prints the run id and mode", () => {
    printPipelineRunReport(_report([DRIVE]));

    expect(_logs()).toContain(
      "00000000-0000-4000-8000-000000000001 (incremental)",
    );
  });

  it("prints one line per drive with its window and counts", () => {
    printPipelineRunReport(_report([DRIVE]));

    expect(_logs()).toContain(
      "https://data.cityofnewyork.us  2026-10-01T00:00:00.000Z to now  " +
        "fetched 120, written 3, unchanged 117, newest 2026-10-20T12:00:00.000Z",
    );
  });

  it("prints a failed drive's error", () => {
    printPipelineRunReport(
      _report([
        {
          ...DRIVE,
          status: "failed",
          error: "HTTP GET request failed with status 429.",
        },
      ]),
    );

    expect(_logs()).toContain(
      "error: HTTP GET request failed with status 429.",
    );
  });

  it("marks a drive the limit skipped", () => {
    printPipelineRunReport(_report([{ ...DRIVE, status: "skipped" }]));

    expect(_logs()).toContain("(limit reached)");
  });

  it("says when no drive is configured", () => {
    printPipelineRunReport(_report([]));

    expect(_logs()).toContain("No drives are configured");
  });
});
