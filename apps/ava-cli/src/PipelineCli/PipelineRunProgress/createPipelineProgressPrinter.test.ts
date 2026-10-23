import { createPipelineProgressPrinter } from "@ava-cli/PipelineCli/PipelineRunProgress/createPipelineProgressPrinter";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A progress event as the runner sends it, with run totals. */
function _progress(overrides: Record<string, unknown> = {}): unknown {
  return {
    stage: "page_loaded",
    driveKey: "hdx",
    scopeKey: "format:csv",
    crawlNumber: 1,
    crawlCount: 2,
    limit: 10,
    connectionsFetched: 4,
    relationsTransformed: 12,
    columnsFound: 120,
    ...overrides,
  };
}

/** Each line printed so far, without its color tag. */
function _lines(): string[] {
  return vi.mocked(Acclimate.log).mock.calls.map(([line]) => {
    return String(line).replace(/^\|\w+\|/, "");
  });
}

describe("createPipelineProgressPrinter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("prints the crawl, percent of the limit, datasets, tables, columns, and elapsed time", () => {
    const printer = createPipelineProgressPrinter();
    printer.print(_progress({ stage: "crawl_started", connectionsFetched: 0 }));
    vi.advanceTimersByTime(3000);
    printer.print(_progress());
    printer.stop();

    expect(_lines()).toEqual([
      "[1/2] Crawling hdx [format:csv] · 0% of the 10-dataset limit · 0 datasets · 12 tables · 120 columns · 0 ms",
      "[1/2] hdx [format:csv] · 40% of the 10-dataset limit · 4 datasets · 12 tables · 120 columns · 3.0 s",
    ]);
  });

  it("prints the percent of crawls done when the run has no limit", () => {
    const printer = createPipelineProgressPrinter();
    printer.print(
      _progress({ stage: "crawl_finished", limit: undefined, status: "ok" }),
    );
    printer.stop();

    expect(_lines()).toEqual([
      "[1/2] Finished hdx [format:csv] (ok) · 50% of crawls done · 4 datasets · 12 tables · 120 columns · 0 ms",
    ]);
  });

  it("prints at most one page update every 5 seconds", () => {
    const printer = createPipelineProgressPrinter();
    printer.print(_progress({ connectionsFetched: 1 }));
    vi.advanceTimersByTime(1000);
    printer.print(_progress({ connectionsFetched: 2 }));
    vi.advanceTimersByTime(4000);
    printer.print(_progress({ connectionsFetched: 3 }));
    printer.stop();

    expect(
      _lines().map((line) => {
        return line.split(" · ")[2];
      }),
    ).toEqual(["1 datasets", "3 datasets"]);
  });

  it("leaves out crawls the limit skipped, since the report lists them", () => {
    const printer = createPipelineProgressPrinter();
    printer.print(_progress({ stage: "crawl_finished", status: "skipped" }));
    printer.stop();

    expect(_lines()).toEqual([]);
  });

  it("says it is still running, with the latest progress, after 15 seconds without printing", () => {
    const printer = createPipelineProgressPrinter();
    printer.print(_progress({ connectionsFetched: 1 }));
    vi.advanceTimersByTime(1000);
    printer.print(_progress({ connectionsFetched: 2 }));
    vi.advanceTimersByTime(15000);
    printer.stop();
    vi.advanceTimersByTime(60000);

    expect(_lines().slice(1)).toEqual([
      "Still running, no update for 15.0 s. Last: [1/2] hdx [format:csv] · 20% of the 10-dataset limit · 2 datasets · 12 tables · 120 columns · 1.0 s",
    ]);
  });

  it("says it is still starting when no progress has arrived", () => {
    const printer = createPipelineProgressPrinter();
    vi.advanceTimersByTime(15000);
    printer.stop();

    expect(_lines()).toEqual([
      "Still running, no update for 15.0 s. Last: starting the run",
    ]);
  });

  it("ignores an event it cannot read", () => {
    const printer = createPipelineProgressPrinter();
    printer.print({ stage: "unknown" });
    printer.stop();

    expect(_lines()).toEqual([]);
  });
});
