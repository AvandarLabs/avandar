import { runPipelineLocal } from "@ava-cli/PipelineCli/runPipelineLocal";
import { Acclimate } from "@avandar/acclimate";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ava-cli/PipelineCli/runPipelineLocal", () => {
  return {
    findAvandarRepoRoot: vi.fn(() => {
      return "/repo";
    }),
    runPipelineLocal: vi.fn(() => {
      return { ok: true, pipelineRunId: "local-run-id", errorText: "" };
    }),
  };
});

type FetchCall = readonly [
  input: string,
  init?:
    | {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      }
    | undefined,
];

type FetchMock = ((input: string, init?: FetchCall[1]) => Promise<Response>) & {
  mock: {
    calls: FetchCall[];
  };
};

function _mockFetch(
  impl: (input: string, init?: FetchCall[1]) => Promise<Response>,
): FetchMock {
  const fetchMock = vi.fn(impl) as unknown as FetchMock;
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function _getCombinedLogs(): string {
  const logCalls = (Acclimate.log as unknown as { mock: { calls: unknown[] } })
    .mock.calls;

  return logCalls.flat().join("\n");
}

describe("runPipelineCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

    process.env.AVA_PIPELINE_SERVER_URL = "https://pipeline.example/";
    process.env.AVA_PIPELINE_SERVER_SECRET = "secret";

    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  it("runs a pipeline", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response("00000000-0000-4000-8000-000000000001", {
        status: 200,
      });
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({ name: "world-bank__wdi", local: false });

    expect(fetchMock.mock.calls.length).toBe(1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://pipeline.example/world-bank__wdi/run");
    expect(init?.method).toBe("POST");
    expect(init?.headers?.authorization).toBe("Bearer secret");

    const logs = _getCombinedLogs();
    expect(logs).toContain("Running pipeline: world-bank__wdi");
    expect(logs).toContain("00000000-0000-4000-8000-000000000001");
  });

  it("throws when AVA_PIPELINE_SERVER_URL is missing", async () => {
    delete process.env.AVA_PIPELINE_SERVER_URL;

    const { runPipelineCommand } = await import("./RunPipelineCli");

    await expect(
      runPipelineCommand({ name: "world-bank__wdi", local: false }),
    ).rejects.toThrow("AVA_PIPELINE_SERVER_URL is not set in .env.development");
  });

  it("throws on non-2xx responses", async () => {
    _mockFetch(async () => {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Unauthorized.",
        }),
        {
          status: 401,
          statusText: "Unauthorized",
        },
      );
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");

    await expect(
      runPipelineCommand({ name: "world-bank__wdi", local: false }),
    ).rejects.toThrow("401 Unauthorized");

    const logs = _getCombinedLogs();
    expect(logs).toContain("Failed to run pipeline: world-bank__wdi");
  });

  it("sends the limit to the pipeline server as a JSON body", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response("run-id", { status: 200 });
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({ name: "socrata", local: false, limit: 5 });

    const [, init] = fetchMock.mock.calls[0]!;
    expect([init?.headers?.["content-type"], init?.body]).toEqual([
      "application/json",
      '{"limit":5}',
    ]);
  });

  it("sends no body when no option is given", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response("run-id", { status: 200 });
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({ name: "socrata", local: false });

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(undefined);
  });

  it("passes the limit to a local run", async () => {
    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({ name: "hdx", local: true, limit: 3 });

    expect(vi.mocked(runPipelineLocal)).toHaveBeenCalledWith({
      pipelineName: "hdx",
      repoRoot: "/repo",
      runOptions: { limit: 3 },
    });
  });

  it("sends incremental and until to the pipeline server", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response("run-id", { status: 200 });
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({
      name: "socrata",
      local: false,
      incremental: true,
      until: "2026-10-15T00:00:00Z",
    });

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      '{"incremental":true,"until":"2026-10-15T00:00:00Z"}',
    );
  });

  it("sends only the keys the server accepts", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response("run-id", { status: 200 });
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({
      name: "socrata",
      local: false,
      incremental: false,
      since: "2026-10-01T00:00:00Z",
      limit: 2,
    });

    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      '{"since":"2026-10-01T00:00:00Z","limit":2}',
    );
  });

  it("passes since to a local run", async () => {
    const { runPipelineCommand } = await import("./RunPipelineCli");
    await runPipelineCommand({
      name: "socrata",
      local: true,
      since: "2026-10-01T00:00:00Z",
    });

    expect(vi.mocked(runPipelineLocal)).toHaveBeenCalledWith({
      pipelineName: "socrata",
      repoRoot: "/repo",
      runOptions: { since: "2026-10-01T00:00:00Z" },
    });
  });

  it("rejects incremental with since before sending anything", async () => {
    const fetchMock = _mockFetch(async () => {
      return new Response("run-id", { status: 200 });
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");

    await expect(
      runPipelineCommand({
        name: "socrata",
        local: false,
        incremental: true,
        since: "2026-10-01T00:00:00Z",
      }),
    ).rejects.toThrow("not both");
    expect([
      fetchMock.mock.calls.length,
      vi.mocked(runPipelineLocal).mock.calls.length,
    ]).toEqual([0, 0]);
  });

  it("rejects incremental with since before a local run too", async () => {
    const { runPipelineCommand } = await import("./RunPipelineCli");

    await expect(
      runPipelineCommand({
        name: "socrata",
        local: true,
        incremental: true,
        since: "2026-10-01T00:00:00Z",
      }),
    ).rejects.toThrow("not both");
    expect(vi.mocked(runPipelineLocal)).not.toHaveBeenCalled();
  });

  it("shows the server's own message when it answers 400", async () => {
    _mockFetch(async () => {
      return new Response(
        JSON.stringify({ ok: false, error: "--since must be earlier than --until." }),
        { status: 400, statusText: "Bad Request" },
      );
    });

    const { runPipelineCommand } = await import("./RunPipelineCli");

    await expect(
      runPipelineCommand({ name: "socrata", local: false, until: "x" }),
    ).rejects.toThrow(/^--since must be earlier than --until\.$/);
    expect(_getCombinedLogs()).toContain(
      "--since must be earlier than --until.",
    );
  });
});
