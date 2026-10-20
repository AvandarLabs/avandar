import { spawnSync } from "node:child_process";
import { runPipelineLocal } from "@ava-cli/PipelineCli/runPipelineLocal";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => {
  return {
    spawnSync: vi.fn(() => {
      return { status: 0, stdout: "run-id\n", stderr: "", error: undefined };
    }),
  };
});

/** A `spawnSync` result with the given exit status and output. */
function _spawnResult(args: {
  status: number;
  stdout: string;
  stderr?: string;
}): ReturnType<typeof spawnSync> {
  return {
    pid: 1,
    output: [],
    signal: null,
    status: args.status,
    stdout: args.stdout,
    stderr: args.stderr ?? "",
  };
}

describe("runPipelineLocal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    expect(vi.mocked(spawnSync).mock.calls[0]?.[1]?.slice(-1)).toEqual([
      "hdx",
    ]);
  });
  it("returns the last stdout line as the report JSON when the run succeeds", () => {
    vi.mocked(spawnSync).mockReturnValueOnce(
      _spawnResult({ status: 0, stdout: 'log line\n{"pipelineRunId":"r"}\n' }),
    );

    const result = runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: {},
    });

    expect(result).toEqual({
      ok: true,
      reportJson: '{"pipelineRunId":"r"}',
      errorText: "",
    });
  });

  it("keeps a failed run's report JSON out of its error text", () => {
    vi.mocked(spawnSync).mockReturnValueOnce(
      _spawnResult({
        status: 1,
        stdout: 'log line\n{"pipelineRunId":"r"}\n',
        stderr: "Every drive failed.\n",
      }),
    );

    const result = runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: {},
    });

    expect(result).toEqual({
      ok: false,
      reportJson: '{"pipelineRunId":"r"}',
      errorText: "Every drive failed.\nlog line",
    });
  });

  it("returns no report JSON when a failed run's last line is not JSON", () => {
    vi.mocked(spawnSync).mockReturnValueOnce(
      _spawnResult({ status: 1, stdout: "", stderr: "Error: boom\n" }),
    );

    const result = runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: {},
    });

    expect(result).toEqual({
      ok: false,
      reportJson: "",
      errorText: "Error: boom",
    });
  });
});
