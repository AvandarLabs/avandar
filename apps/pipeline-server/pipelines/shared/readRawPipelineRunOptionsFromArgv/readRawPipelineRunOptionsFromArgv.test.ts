import { readRawPipelineRunOptionsFromArgv } from "@pipelines/shared/readRawPipelineRunOptionsFromArgv/readRawPipelineRunOptionsFromArgv";
import { describe, expect, it } from "vitest";

describe("readRawPipelineRunOptionsFromArgv", () => {
  it("reads --incremental, --until, and --limit", () => {
    expect(
      readRawPipelineRunOptionsFromArgv([
        "--incremental",
        "--until",
        "2026-10-15T00:00:00Z",
        "--limit",
        "5",
      ]),
    ).toEqual({ incremental: true, until: "2026-10-15T00:00:00Z", limit: "5" });
  });

  it("reads --since", () => {
    expect(
      readRawPipelineRunOptionsFromArgv(["--since", "2026-10-01T00:00:00Z"])
        .since,
    ).toBe("2026-10-01T00:00:00Z");
  });

  it("reads a flag with no value as an empty string, so parsing rejects it", () => {
    expect(readRawPipelineRunOptionsFromArgv(["--since"]).since).toBe("");
  });

  it("leaves every option unset when no flag is given", () => {
    expect(readRawPipelineRunOptionsFromArgv([])).toEqual({});
  });
});
