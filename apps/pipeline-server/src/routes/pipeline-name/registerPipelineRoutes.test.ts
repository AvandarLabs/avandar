import { registerPipelineRoutes } from "@pipeline-server/routes/pipeline-name/registerPipelineRoutes";
import { run } from "@pipeline-server/routes/pipeline-name/run/run";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("@pipeline-server/routes/pipeline-name/run/run", () => {
  return {
    run: vi.fn(),
  };
});

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
    vi.mocked(run).mockResolvedValue("00000000-0000-4000-8000-000000000001");
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

  it("returns the pipeline run id when auth succeeds", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/example-pipeline/run",
      headers: {
        authorization: AUTH_HEADER,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toBe("00000000-0000-4000-8000-000000000001");
    expect(vi.mocked(run)).toHaveBeenCalledWith({
      pipelineName: "example-pipeline",
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
      limit: 5,
    });
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
});
