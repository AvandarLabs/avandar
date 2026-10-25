import { sendRunPipelineRequest } from "@ava-cli/PipelineCli/sendRunPipelineRequest";
import { Agent } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("undici", () => {
  return {
    Agent: vi.fn(function MockAgent() {
      return { close: vi.fn(async () => {}) };
    }),
  };
});

/** Two hours, the longest the CLI waits on a run's response. */
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const REPORT = {
  pipelineRunId: "00000000-0000-4000-8000-000000000001",
  mode: "full",
  crawls: [],
};

describe("sendRunPipelineRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.AVA_PIPELINE_SERVER_URL = "https://pipeline.example/";
    process.env.AVA_PIPELINE_SERVER_SECRET = "secret";
  });

  it("waits up to two hours for the response headers and body", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(REPORT), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendRunPipelineRequest({ pipelineName: "hdx", runOptions: {} });

    const agent: unknown = vi.mocked(Agent).mock.results[0]?.value;
    expect([
      vi.mocked(Agent).mock.calls[0]?.[0],
      (fetchMock.mock.calls[0] as unknown[] | undefined)?.[1],
    ]).toEqual([
      { headersTimeout: TWO_HOURS_MS, bodyTimeout: TWO_HOURS_MS },
      expect.objectContaining({ dispatcher: agent }),
    ]);
  });

  it("sends the CLI's argv and actor in X-Ava-Invocation, as ASCII JSON", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify(REPORT), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendRunPipelineRequest({
      pipelineName: "hdx",
      runOptions: {},
      invocation: {
        cliArgv: ["pipeline", "run", "hdx", "--since", "café"],
        actor: "pablo@laptop",
        host: "laptop",
        codeVersion: "abc123",
      },
    });

    const init = (fetchMock.mock.calls[0] as unknown[] | undefined)?.[1] as
      | { headers: Record<string, string> }
      | undefined;
    const header = init?.headers["x-ava-invocation"] ?? "";
    expect([header, JSON.parse(header)]).toEqual([
      '{"cliArgv":["pipeline","run","hdx","--since","caf\\u00e9"],"actor":"pablo@laptop"}',
      {
        cliArgv: ["pipeline", "run", "hdx", "--since", "café"],
        actor: "pablo@laptop",
      },
    ]);
  });
});
