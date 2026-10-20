import { spawnSync } from "node:child_process";
import { runPipelineLocal } from "@ava-cli/PipelineCli/runPipelineLocal";
import { describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => {
  return {
    spawnSync: vi.fn(() => {
      return { status: 0, stdout: "run-id\n", stderr: "", error: undefined };
    }),
  };
});

describe("runPipelineLocal", () => {
  it("passes every run option to the runner as flags", () => {
    runPipelineLocal({
      pipelineName: "socrata",
      repoRoot: "/repo",
      runOptions: {
        incremental: true,
        since: "2026-10-01T00:00:00Z",
        until: "2026-10-15T00:00:00Z",
        limit: 5,
      },
    });

    expect(vi.mocked(spawnSync).mock.calls[0]?.[1]?.slice(-8)).toEqual([
      "socrata",
      "--incremental",
      "--since",
      "2026-10-01T00:00:00Z",
      "--until",
      "2026-10-15T00:00:00Z",
      "--limit",
      "5",
    ]);
  });

  it("passes no flag when no option is given", () => {
    runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: {},
    });

    expect(vi.mocked(spawnSync).mock.calls.at(-1)?.[1]?.slice(-1)).toEqual([
      "hdx",
    ]);
  });
});
