import { EtlRunFailedError, EtlRunOptionsError } from "@avandar/etl";
import { registerPipelineRoutes } from "@pipeline-server/routes/pipeline-name/registerPipelineRoutes";
import { run } from "@pipeline-server/routes/pipeline-name/run/run";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EtlPipelineRunId, EtlRunReport } from "@avandar/etl";
import type { FastifyInstance } from "fastify";

vi.mock("@pipeline-server/routes/pipeline-name/run/run", () => {
  return {
    run: vi.fn(),
  };
});

const REPORT: EtlRunReport = {
  pipelineRunId: "00000000-0000-4000-8000-000000000001" as EtlPipelineRunId,
  mode: "full",
  crawls: [],
};

const SECRET = "test-secret";
const AUTH_HEADER = `Bearer ${SECRET}`;

async function _createServer(): Promise<FastifyInstance> {
  const server: FastifyInstance = Fastify({
    logger: false,
  });

  await server.register(registerPipelineRoutes);

  return server;
}

describe("registerRunPipelineRoutes", () => {
  let server: FastifyInstance | undefined = undefined;

  beforeEach(() => {
    process.env.AVA_PIPELINE_SERVER_SECRET = SECRET;
    vi.mocked(run).mockResolvedValue(REPORT);
  });

  afterEach(async () => {
    delete process.env.AVA_PIPELINE_SERVER_SECRET;
    vi.clearAllMocks();

    if (server) {
      await server.close();
      server = undefined;
    }
  });

  it("returns 500 when the server secret is missing", async () => {
    delete process.env.AVA_PIPELINE_SERVER_SECRET;
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/daily-sync/run",
      headers: {
        authorization: AUTH_HEADER,
      },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      ok: false,
      error: "Server is missing AVA_PIPELINE_SERVER_SECRET.",
    });
  });

  it("returns 401 when auth is missing", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/daily-sync/run",
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      ok: false,
      error: "Unauthorized.",
    });
  });

  it("returns 401 when the bearer token is incorrect", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/daily-sync/run",
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      ok: false,
      error: "Unauthorized.",
    });
  });

  it("answers with the run report as JSON when auth succeeds", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
    });

    expect([res.statusCode, res.headers["content-type"], res.json()]).toEqual([
      200,
      expect.stringContaining("application/json"),
      REPORT,
    ]);
    expect(vi.mocked(run)).toHaveBeenCalledWith({
      pipelineName: "example-pipeline",
      mode: "full",
    });
  });

  it("passes the limit from a JSON body to the pipeline run", async () => {
    server = await _createServer();

    await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { limit: 5 },
    });

    expect(vi.mocked(run)).toHaveBeenCalledWith({
      pipelineName: "example-pipeline",
      mode: "full",
      limit: 5,
    });
  });

  it("passes incremental, until, and limit from a JSON body to the run", async () => {
    server = await _createServer();

    await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { incremental: true, until: "2026-10-15T00:00:00Z", limit: 5 },
    });

    expect(vi.mocked(run)).toHaveBeenCalledWith({
      pipelineName: "example-pipeline",
      mode: "incremental",
      until: new Date("2026-10-15T00:00:00Z"),
      limit: 5,
    });
  });

  it("returns 400 and skips the run when incremental and since are combined", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { incremental: true, since: "2026-10-01T00:00:00Z" },
    });

    expect([res.statusCode, vi.mocked(run).mock.calls.length]).toEqual([
      400, 0,
    ]);
  });

  it("returns 400 and skips the run when since has no timezone", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { since: "2026-10-01" },
    });

    expect([res.statusCode, vi.mocked(run).mock.calls.length]).toEqual([
      400, 0,
    ]);
  });

  it("returns 400 and skips the run when the limit is not a positive integer", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { limit: 0 },
    });

    expect(res.statusCode).toBe(400);
    expect(vi.mocked(run)).not.toHaveBeenCalled();
  });

  it("passes scopes from a JSON body to the run", async () => {
    server = await _createServer();

    await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { scopes: ["format:csv"] },
    });

    expect(vi.mocked(run)).toHaveBeenCalledWith({
      pipelineName: "example-pipeline",
      mode: "full",
      scopes: ["format:csv"],
    });
  });

  it("returns 400 and skips the run for an invalid scope", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { scopes: ["Not Valid"] },
    });

    expect([res.statusCode, vi.mocked(run).mock.calls.length]).toEqual([
      400, 0,
    ]);
  });

  it("returns 400 and skips the run when the body has an unknown option", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { incremntal: true },
    });

    expect([
      res.statusCode,
      res.json().error,
      vi.mocked(run).mock.calls.length,
    ]).toEqual([
      400,
      expect.stringContaining(
        "accepts only incremental, since, until, limit, and scopes",
      ),
      0,
    ]);
  });

  it("returns 401 before checking the body when auth is missing", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      payload: { incremntal: true },
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 400 with the message when the engine rejects the options", async () => {
    vi.mocked(run).mockRejectedValue(
      new EtlRunOptionsError(
        "The wdi pipeline does not support incremental runs.",
      ),
    );
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
      payload: { incremental: true },
    });

    expect([res.statusCode, res.json()]).toEqual([
      400,
      {
        ok: false,
        error: "The wdi pipeline does not support incremental runs.",
      },
    ]);
  });

  it("returns 500 with the message when the run fails for another reason", async () => {
    vi.mocked(run).mockRejectedValue(new Error("Source is down."));
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
    });

    expect([res.statusCode, res.json()]).toEqual([
      500,
      { ok: false, error: "Source is down." },
    ]);
  });
  it("returns 500 with the report when every drive failed", async () => {
    const failedReport: EtlRunReport = {
      ...REPORT,
      crawls: [
        {
          driveKey: "https://data.cityofnewyork.us",
          scopeKey: "all",
          window: { since: new Date("2026-10-01T00:00:00Z"), until: undefined },
          connectionsFetched: 0,
          relationsWritten: 0,
          relationsUnchanged: 0,
          newestTimestamp: undefined,
          status: "failed",
          error: "HTTP GET request failed with status 429.",
        },
      ],
    };
    const error = new EtlRunFailedError({
      report: failedReport,
      errors: [new Error("HTTP GET request failed with status 429.")],
    });
    vi.mocked(run).mockRejectedValue(error);
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: { authorization: AUTH_HEADER },
    });

    expect([res.statusCode, res.json()]).toEqual([
      500,
      {
        ok: false,
        error: error.message,
        report: JSON.parse(JSON.stringify(failedReport)),
      },
    ]);
  });
});
