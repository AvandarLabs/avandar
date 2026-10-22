import {
  formatDuration,
  printPipelineRunReport,
  printReceivedPipelineRunReport,
} from "@ava-cli/PipelineCli/PipelineRunReport/printPipelineRunReport";
import { Acclimate } from "@avandar/acclimate";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PipelineRunReport } from "@ava-cli/PipelineCli/PipelineRunReport/PipelineRunReport.schemas";

const DRIVE = {
  driveKey: "https://data.cityofnewyork.us",
  scopeKey: "all",
  window: { since: "2026-10-01T00:00:00.000Z" },
  connectionsFetched: 120,
  relationsWritten: 3,
  relationsUnchanged: 117,
  newestTimestamp: "2026-10-20T12:00:00.000Z",
  status: "ok",
} as const;

const FAILED_DRIVE = {
  ...DRIVE,
  status: "failed",
  error: "HTTP GET request failed with status 429.",
} as const;

function _report(crawls: PipelineRunReport["crawls"]): PipelineRunReport {
  return {
    pipelineRunId: "00000000-0000-4000-8000-000000000001",
    mode: "incremental",
    crawls,
  };
}

function _logs(): string {
  const calls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;
  return calls.flat().join("\n");
}

describe("formatDuration", () => {
  it.each([
    [850, "850 ms"],
    [1200, "1.2 s"],
    [245_000, "4 min 05 s"],
  ])("formats %s ms as %s", (durationMs, expected) => {
    expect(formatDuration(durationMs)).toBe(expected);
  });
});

describe("printPipelineRunReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  it("prints the run id and mode", () => {
    printPipelineRunReport(_report([DRIVE]));

    expect(_logs()).toContain(
      "00000000-0000-4000-8000-000000000001 (incremental)",
    );
  });

  it("prints a crawl's drive and scope, then its window and counts on indented lines", () => {
    printPipelineRunReport(_report([DRIVE]));

    expect(_logs()).toContain(
      "ok      https://data.cityofnewyork.us [all]\n" +
        "        2026-10-01T00:00:00.000Z to now\n" +
        "        fetched 120, written 3, unchanged 117, " +
        "newest 2026-10-20T12:00:00.000Z",
    );
  });

  it("keeps every line of a drive with a full window within 80 columns", () => {
    printPipelineRunReport(
      _report([
        {
          ...DRIVE,
          window: {
            since: "2026-10-01T00:00:00.000Z",
            until: "2026-10-20T00:00:00.000Z",
          },
        },
      ]),
    );

    const lineLengths = _logs()
      .replace(/\|\w+\|/g, "")
      .split("\n")
      .map((line) => {
        return line.length;
      });
    expect(Math.max(...lineLengths)).toBeLessThanOrEqual(80);
  });

  it("prints a failed drive's error", () => {
    printPipelineRunReport(_report([FAILED_DRIVE]));

    expect(_logs()).toContain(
      "error: HTTP GET request failed with status 429.",
    );
  });

  it("marks a drive the limit skipped", () => {
    printPipelineRunReport(_report([{ ...DRIVE, status: "skipped" }]));

    expect(_logs()).toContain("(limit reached)");
  });

  it("prints a status it does not know as is", () => {
    printPipelineRunReport(_report([{ ...DRIVE, status: "paused" }]));

    expect(_logs()).toContain("paused  https://data.cityofnewyork.us");
  });

  it("says when no drive is configured", () => {
    printPipelineRunReport(_report([]));

    expect(_logs()).toContain("No drives or scopes are configured");
  });

  it("prints the header green when no drive failed", () => {
    printPipelineRunReport(_report([DRIVE]));

    expect(_logs()).toContain("|green|Pipeline run");
  });

  it("prints the header yellow when some drives failed", () => {
    printPipelineRunReport(_report([DRIVE, FAILED_DRIVE]));

    expect(_logs()).toContain("|yellow|Pipeline run");
  });

  it("prints the header red when every drive failed", () => {
    printPipelineRunReport(_report([FAILED_DRIVE]));

    expect(_logs()).toContain("|red|Pipeline run");
  });
  it("prints how long a crawl took on its window line", () => {
    printPipelineRunReport(
      _report([
        {
          ...DRIVE,
          startedAt: "2026-10-22T10:00:00.000Z",
          finishedAt: "2026-10-22T10:00:01.200Z",
        },
      ]),
    );

    expect(_logs()).toContain("2026-10-01T00:00:00.000Z to now, took 1.2 s");
  });

  it("prints the run's total time and its setup after the crawls", () => {
    printPipelineRunReport({
      ..._report([DRIVE]),
      startedAt: "2026-10-22T10:00:00.000Z",
      finishedAt: "2026-10-22T10:04:05.000Z",
      setupMs: 850,
    });

    expect(_logs()).toContain(
      "Took 4 min 05 s (850 ms listing drives and scopes).",
    );
  });

  it("prints no duration for a report without times", () => {
    printPipelineRunReport(_report([DRIVE]));

    expect(_logs()).not.toMatch(/took/i);
  });

  it("keeps a full window with an hour-long duration within 80 columns", () => {
    printPipelineRunReport(
      _report([
        {
          ...DRIVE,
          window: {
            since: "2026-10-01T00:00:00.000Z",
            until: "2026-10-20T00:00:00.000Z",
          },
          startedAt: "2026-10-22T10:00:00.000Z",
          finishedAt: "2026-10-22T10:59:59.000Z",
        },
      ]),
    );

    const lineLengths = _logs()
      .replace(/\|\w+\|/g, "")
      .split("\n")
      .map((line) => {
        return line.length;
      });
    expect(Math.max(...lineLengths)).toBeLessThanOrEqual(80);
  });
});

describe("printReceivedPipelineRunReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  it("prints a report it could not read as its raw JSON", () => {
    printReceivedPipelineRunReport({
      isReadable: false,
      json: '{"pipelineRunId":5}',
    });

    expect(_logs()).toContain('{"pipelineRunId":5}');
  });
});
