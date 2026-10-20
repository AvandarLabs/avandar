import { parsePipelineRunOptions } from "@pipelines/shared/parsePipelineRunOptions/parsePipelineRunOptions";
import { describe, expect, it } from "vitest";

const SINCE = "2026-10-01T00:00:00Z";
const UNTIL = "2026-10-15T00:00:00Z";

describe("parsePipelineRunOptions", () => {
  it("reads no options as a full run", () => {
    expect(parsePipelineRunOptions({})).toEqual({ mode: "full" });
  });

  it("reads incremental as an incremental run", () => {
    expect(parsePipelineRunOptions({ incremental: true }).mode).toBe(
      "incremental",
    );
  });

  it("reads since and until as dates", () => {
    expect(parsePipelineRunOptions({ since: SINCE, until: UNTIL })).toEqual({
      mode: "full",
      since: new Date(SINCE),
      until: new Date(UNTIL),
    });
  });

  it("accepts until together with incremental", () => {
    expect(
      parsePipelineRunOptions({ incremental: true, until: UNTIL }),
    ).toEqual({
      mode: "incremental",
      until: new Date(UNTIL),
    });
  });

  it("accepts a timestamp with a numeric offset", () => {
    expect(
      parsePipelineRunOptions({ since: "2026-10-01T02:00:00+02:00" }).since,
    ).toEqual(new Date(SINCE));
  });

  it("reads a numeric limit from argv's string or a JSON number", () => {
    expect([
      parsePipelineRunOptions({ limit: "5" }).limit,
      parsePipelineRunOptions({ limit: 5 }).limit,
    ]).toEqual([5, 5]);
  });

  it("rejects incremental together with since", () => {
    expect(() => {
      return parsePipelineRunOptions({ incremental: true, since: SINCE });
    }).toThrow("not both");
  });

  it("rejects a since with no timezone", () => {
    expect(() => {
      return parsePipelineRunOptions({ since: "2026-10-01" });
    }).toThrow("timezone");
  });

  it("rejects an until with no timezone", () => {
    expect(() => {
      return parsePipelineRunOptions({ until: "2026-10-01T00:00:00" });
    }).toThrow("timezone");
  });

  it("rejects a since at or after until", () => {
    expect(() => {
      return parsePipelineRunOptions({ since: UNTIL, until: UNTIL });
    }).toThrow("earlier");
  });

  it("rejects a limit that is not a positive integer", () => {
    expect(() => {
      return parsePipelineRunOptions({ limit: 0 });
    }).toThrow("positive integer");
  });

  it("rejects an incremental flag that is not a boolean", () => {
    expect(() => {
      return parsePipelineRunOptions({ incremental: "yes" });
    }).toThrow("incremental");
  });
});
