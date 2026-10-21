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
});
