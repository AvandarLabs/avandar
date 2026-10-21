import { spawnSync } from "node:child_process";
import { fetchLivePipelineScopes } from "@ava-cli/PipelineCli/fetchLivePipelineScopes/fetchLivePipelineScopes";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => {
  return { spawnSync: vi.fn() };
});

vi.mock("@ava-cli/PipelineCli/runPipelineLocal", () => {
  return {
    findAvandarRepoRoot: vi.fn(() => {
      return "/repo";
    }),
  };
});

/** A successful `spawnSync` result that printed `stdout`. */
function _spawnResultWithStdout(stdout: string): ReturnType<typeof spawnSync> {
  return {
    pid: 1,
    output: [],
    signal: null,
    status: 0,
    stdout,
    stderr: "",
  };
}

const BODY = {
  drives: [
    {
      driveKey: "https://data.humdata.org",
      scopeKeys: ["format:csv", "format:parquet"],
    },
  ],
};

describe("fetchLivePipelineScopes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.AVA_PIPELINE_SERVER_URL = "https://pipeline.example/";
    process.env.AVA_PIPELINE_SERVER_SECRET = "secret";
  });

  it("asks the pipeline server, with its secret", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(BODY), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const scopes = await fetchLivePipelineScopes({
      pipelineName: "hdx",
      local: false,
    });

    expect([scopes, fetchMock.mock.calls[0]]).toEqual([
      BODY.drives,
      [
        "https://pipeline.example/hdx/scopes",
        { headers: { authorization: "Bearer secret" } },
      ],
    ]);
  });

  it("names the status when the server cannot list the scopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response('{"ok":false,"error":"nope"}', { status: 500 });
      }),
    );

    await expect(
      fetchLivePipelineScopes({ pipelineName: "hdx", local: false }),
    ).rejects.toThrow("answered 500");
  });

  it("runs the local script and reads its last line", async () => {
    vi.mocked(spawnSync).mockReturnValue({
      pid: 1,
      output: [],
      signal: null,
      status: 0,
      stdout: `some log\n${JSON.stringify(BODY)}\n`,
      stderr: "",
    });

    const scopes = await fetchLivePipelineScopes({
      pipelineName: "hdx",
      local: true,
    });

    expect([scopes, vi.mocked(spawnSync).mock.calls[0]?.[1]]).toEqual([
      BODY.drives,
      [
        "exec",
        "vite-node",
        "--config",
        "vite.script.config.ts",
        "/repo/scripts/listPipelineScopes.ts",
        "hdx",
      ],
    ]);
  });

  it("explains empty local script output, naming the pipeline and source", async () => {
    vi.mocked(spawnSync).mockReturnValue(_spawnResultWithStdout(""));

    await expect(
      fetchLivePipelineScopes({ pipelineName: "hdx", local: true }),
    ).rejects.toThrow(
      /hdx pipeline's scopes from scripts\/listPipelineScopes\.ts.*: ""$/,
    );
  });

  it("explains a local last line that is not JSON, keeping the cause", async () => {
    vi.mocked(spawnSync).mockReturnValue(
      _spawnResultWithStdout("{}\nDone in 2s.\n"),
    );

    const error = await fetchLivePipelineScopes({
      pipelineName: "hdx",
      local: true,
    }).catch((caught: unknown) => {
      return caught;
    });

    expect([
      (error as Error).message,
      (error as Error).cause instanceof SyntaxError,
    ]).toEqual([expect.stringContaining('"Done in 2s."'), true]);
  });

  it("explains a 200 server response with an HTML body, trimmed", async () => {
    const html = `<!doctype html><html>${"x".repeat(500)}</html>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(html, { status: 200 });
      }),
    );

    const error = await fetchLivePipelineScopes({
      pipelineName: "hdx",
      local: false,
    }).catch((caught: unknown) => {
      return caught;
    });

    expect([
      (error as Error).message,
      (error as Error).message.includes(html),
      (error as Error).cause instanceof SyntaxError,
    ]).toEqual([
      expect.stringMatching(/hdx pipeline's scopes from the pipeline server.*<!doctype html>/),
      false,
      true,
    ]);
  });
});
