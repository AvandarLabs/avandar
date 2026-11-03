import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { runPipelineLocal } from "@ava-cli/PipelineCli/runPipelineLocal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChildProcess, SpawnOptions } from "node:child_process";

vi.mock("node:child_process", () => {
  return { spawn: vi.fn() };
});

/** A report line as the runner prints it. */
const REPORT_LINE = JSON.stringify({
  pipelineRunId: "00000000-0000-4000-8000-000000000001",
  mode: "full",
  crawls: [],
});

/**
 * A child process that writes the given output, each stderr chunk as its
 * own write, and then closes with the given exit status.
 */
function _fakeChild(args: {
  status: number;
  stdout: string;
  stderrChunks?: readonly string[];
}): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  Object.assign(child, { stdout, stderr });
  setImmediate(() => {
    stdout.end(args.stdout);
    (args.stderrChunks ?? []).forEach((chunk) => {
      stderr.write(chunk);
    });
    stderr.end();
    setImmediate(() => {
      child.emit("close", args.status);
    });
  });
  return child;
}

/** Makes the next `spawn` return a child with the given output. */
function _mockNextChild(args: Parameters<typeof _fakeChild>[0]): void {
  vi.mocked(spawn).mockImplementationOnce(() => {
    return _fakeChild(args);
  });
}

describe("runPipelineLocal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(spawn).mockImplementation(() => {
      return _fakeChild({ status: 0, stdout: "run-id\n" });
    });
  });

  it("passes the invocation to the runner in AVA_PIPELINE_INVOCATION", async () => {
    const invocation = {
      cliArgv: ["pipeline", "run", "hdx", "--local"],
      actor: "pablo@laptop",
      host: "laptop",
      codeVersion: "abc123",
    };

    await runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: {},
      invocation,
    });

    const spawnOptions = vi.mocked(spawn).mock.calls[0]?.[2] as
      | SpawnOptions
      | undefined;
    expect(
      JSON.parse(spawnOptions?.env?.AVA_PIPELINE_INVOCATION ?? ""),
    ).toEqual(invocation);
  });

  it("passes every run option to the runner as flags", async () => {
    await runPipelineLocal({
      pipelineName: "socrata",
      repoRoot: "/repo",
      runOptions: {
        incremental: true,
        since: "2026-10-01T00:00:00Z",
        until: "2026-10-15T00:00:00Z",
        limit: 5,
      },
    });

    expect(vi.mocked(spawn).mock.calls[0]?.[1]?.slice(-8)).toEqual([
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

  it("passes no flag when no option is given", async () => {
    await runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: {},
    });

    expect(vi.mocked(spawn).mock.calls[0]?.[1]?.slice(-1)).toEqual(["hdx"]);
  });
  it("returns the last stdout line as the report JSON when the run succeeds", async () => {
    _mockNextChild({ status: 0, stdout: 'log line\n{"pipelineRunId":"r"}\n' });

    const result = await runPipelineLocal({
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

  it("keeps a failed run's report JSON out of its error text", async () => {
    _mockNextChild({
      status: 1,
      stdout: `log line\n${REPORT_LINE}\n`,
      stderrChunks: ["Every drive failed.\n"],
    });

    const result = await runPipelineLocal({
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

  it("keeps a failed run's whole output as error text when its JSON is not a report", async () => {
    _mockNextChild({
      status: 1,
      stdout: '{"level":"error"}\n',
      stderrChunks: ["Error: boom\n"],
    });

    const result = await runPipelineLocal({
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

  it("returns no report JSON when a failed run's last line is not JSON", async () => {
    _mockNextChild({ status: 1, stdout: "", stderrChunks: ["Error: boom\n"] });

    const result = await runPipelineLocal({
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

  it("passes scopes to the runner as one comma-separated flag", async () => {
    await runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: { scopes: ["format:csv", "format:parquet"] },
    });

    expect(vi.mocked(spawn).mock.calls[0]?.[1]?.slice(-3)).toEqual([
      "hdx",
      "--scope",
      "format:csv,format:parquet",
    ]);
  });

  it("sends progress lines to onProgress as they arrive and keeps them out of the error text", async () => {
    const progressEvents: unknown[] = [];
    _mockNextChild({
      status: 1,
      stdout: "",
      stderrChunks: [
        'ava-pipeline-progress {"stage":"crawl_',
        'started"}\nError: boom\n',
        'ava-pipeline-progress {"stage":"page_loaded"}\n',
      ],
    });

    const result = await runPipelineLocal({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: {},
      onProgress: (progress) => {
        progressEvents.push(progress);
      },
    });

    expect([progressEvents, result.errorText]).toEqual([
      [{ stage: "crawl_started" }, { stage: "page_loaded" }],
      "Error: boom",
    ]);
  });
});
