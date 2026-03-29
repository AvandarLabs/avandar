import { Acclimate } from "@avandar/acclimate";
import { beforeEach, describe, expect, it, vi } from "vitest";

type FetchCall = readonly [
  input: string,
  init?:
    | {
        method?: string;
        headers?: Record<string, string>;
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

    const { runPipelineCommand } = await import("./RunPipelineCLI");
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

    const { runPipelineCommand } = await import("./RunPipelineCLI");

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

    const { runPipelineCommand } = await import("./RunPipelineCLI");

    await expect(
      runPipelineCommand({ name: "world-bank__wdi", local: false }),
    ).rejects.toThrow("401 Unauthorized");

    const logs = _getCombinedLogs();
    expect(logs).toContain("Failed to run pipeline: world-bank__wdi");
  });
});
