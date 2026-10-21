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

/** A report line as the runner prints it. */
const REPORT_LINE = JSON.stringify({
  pipelineRunId: "00000000-0000-4000-8000-000000000001",
  mode: "full",
  crawls: [],
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
        stdout: `log line\n${REPORT_LINE}\n`,
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
      reportJson: REPORT_LINE,
      errorText: "Every drive failed.\nlog line",
    });
  });

  it("keeps a failed run's whole output as error text when its JSON is not a report", () => {
    vi.mocked(spawnSync).mockReturnValueOnce(
      _spawnResult({
        status: 1,
        stdout: '{"level":"error"}\n',
        stderr: "Error: boom\n",
      }),
    );

    const result = runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: {},
    });

    expect(result).toEqual({
      ok: false,
      reportJson: "",
      errorText: 'Error: boom\n{"level":"error"}',
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

  it("passes scopes to the runner as one comma-separated flag", () => {
    runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: { scopes: ["format:csv", "format:parquet"] },
    });

    expect(vi.mocked(spawnSync).mock.calls[0]?.[1]?.slice(-3)).toEqual([
      "hdx",
      "--scope",
      "format:csv,format:parquet",
    ]);
  });
});
