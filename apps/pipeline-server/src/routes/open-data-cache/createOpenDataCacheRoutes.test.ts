import { createOpenDataCacheRoutes } from "@pipeline-server/routes/open-data-cache/createOpenDataCacheRoutes";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

const SECRET = "test-secret";
const LISTING_ID = "e8ad4499-10e1-47d7-9a34-64e6ea79a8e6";
const BUILD_ID = "9f1d2c3b-0000-4000-8000-000000000002";
const SUPABASE_TARGET = {
  url: "https://abcd.supabase.co",
  serviceRoleKey: "service-role-key",
};
const HEADERS = {
  authorization: `Bearer ${SECRET}`,
  "x-ava-supabase-url": SUPABASE_TARGET.url,
  "x-ava-supabase-service-role-key": SUPABASE_TARGET.serviceRoleKey,
};

describe("createOpenDataCacheRoutes", () => {
  let server: FastifyInstance;
  const enqueueBuild = vi.fn();

  beforeEach(async () => {
    process.env.AVA_PIPELINE_SERVER_SECRET = SECRET;
    enqueueBuild.mockReturnValue(true);
    server = Fastify({ logger: false });
    await server.register(createOpenDataCacheRoutes({ enqueueBuild }));
  });

  afterEach(async () => {
    delete process.env.AVA_PIPELINE_SERVER_SECRET;
    vi.clearAllMocks();
    await server.close();
  });

  function _postBuild(args: {
    listingId?: string;
    headers?: Record<string, string>;
    payload?: unknown;
  }) {
    return server.inject({
      method: "POST",
      url: `/open-data-cache/${args.listingId ?? LISTING_ID}/build`,
      headers: args.headers ?? HEADERS,
      payload: (args.payload ?? { buildId: BUILD_ID }) as object,
    });
  }

  it("queues the build and answers 202 straight away", async () => {
    const res = await _postBuild({});

    expect([res.statusCode, res.json()]).toEqual([
      202,
      { ok: true, isQueued: true },
    ]);
    expect(enqueueBuild).toHaveBeenCalledWith({
      catalogListingId: LISTING_ID,
      buildId: BUILD_ID,
      supabase: SUPABASE_TARGET,
    });
  });

  it("queues a build with the complete sample it was handed, however many megabytes", async () => {
    const completeSampleCsv = `the_geom\n"${"x".repeat(3 * 1024 * 1024)}"\n`;

    const res = await _postBuild({
      payload: { buildId: BUILD_ID, completeSampleCsv },
    });

    expect(res.statusCode).toBe(202);
    expect(enqueueBuild).toHaveBeenCalledWith({
      catalogListingId: LISTING_ID,
      buildId: BUILD_ID,
      completeSampleCsv,
      supabase: SUPABASE_TARGET,
    });
  });

  it("says when the same build is already queued", async () => {
    enqueueBuild.mockReturnValue(false);

    const res = await _postBuild({});

    expect([res.statusCode, res.json()]).toEqual([
      202,
      { ok: true, isQueued: false },
    ]);
  });

  it("answers 401 without the server secret, whatever it sends", async () => {
    const res = await _postBuild({ headers: {}, payload: { nonsense: 1 } });

    expect(res.statusCode).toBe(401);
    expect(enqueueBuild).not.toHaveBeenCalled();
  });

  it("answers 400 when no Supabase project is sent", async () => {
    const res = await _postBuild({
      headers: { authorization: HEADERS.authorization },
    });

    expect([res.statusCode, res.json().error]).toEqual([
      400,
      expect.stringContaining("x-ava-supabase-url"),
    ]);
    expect(enqueueBuild).not.toHaveBeenCalled();
  });

  it.each([
    ["a listing id that is not a UUID", { listingId: "not-a-uuid" }],
    ["no build id", { payload: {} }],
    ["a build id that is not a UUID", { payload: { buildId: "abc" } }],
    ["an unknown body key", { payload: { buildId: BUILD_ID, force: true } }],
  ])("answers 400 for %s", async (_label, args) => {
    const res = await _postBuild(args);

    expect(res.statusCode).toBe(400);
    expect(enqueueBuild).not.toHaveBeenCalled();
  });

  it("never repeats the service role key in a response", async () => {
    const res = await _postBuild({
      headers: { ...HEADERS, "x-ava-supabase-url": "http://abcd.supabase.co" },
    });

    expect(res.body).not.toContain(SUPABASE_TARGET.serviceRoleKey);
  });
});
