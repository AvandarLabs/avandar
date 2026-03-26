import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerPipelineRoutes } from "@pipeline-server/routes/pipeline-name/registerPipelineRoutes";
import type { FastifyInstance } from "fastify";

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
  });

  afterEach(async () => {
    delete process.env.AVA_PIPELINE_SERVER_SECRET;

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

  it("returns the pipeline name as a string when auth succeeds", async () => {
    server = await _createServer();

    const res = await server.inject({
      method: "POST",
      url: "/first-pipeline/run",
      headers: {
        authorization: AUTH_HEADER,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toBe("first-pipeline");
  });
});
