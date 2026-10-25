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

  it("reads --name=value as well as --name value", () => {
    expect(readRawPipelineRunOptionsFromArgv(["--limit=5"]).limit).toBe("5");
  });

  it("throws for a flag with no value", () => {
    expect(() => {
      return readRawPipelineRunOptionsFromArgv(["--since"]);
    }).toThrow("--since");
  });

  it("throws for an unknown flag, such as a misspelled --incremental", () => {
    expect(() => {
      return readRawPipelineRunOptionsFromArgv(["--incremetal"]);
    }).toThrow("--incremetal");
  });

  it("throws for a flag given twice", () => {
    expect(() => {
      return readRawPipelineRunOptionsFromArgv(["--limit", "5", "--limit=6"]);
    }).toThrow("--limit more than once");
  });

  it("throws for a stray positional argument", () => {
    expect(() => {
      return readRawPipelineRunOptionsFromArgv(["5"]);
    }).toThrow();
  });

  it("leaves every option unset when no flag is given", () => {
    expect(readRawPipelineRunOptionsFromArgv([])).toEqual({});
  });

  it("reads --scope as one raw string", () => {
    expect(
      readRawPipelineRunOptionsFromArgv(["--scope", "format:csv,format:parquet"]),
    ).toEqual({ scopes: "format:csv,format:parquet" });
  });

  it("rejects --scope given twice", () => {
    expect(() => {
      return readRawPipelineRunOptionsFromArgv([
        "--scope",
        "format:csv",
        "--scope",
        "format:parquet",
      ]);
    }).toThrow("more than once");
  });
});
