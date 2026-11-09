import {
  readPipelineServerTarget,
  startParquetCopyBuild,
} from "@sbfn/open-data/startParquetCopyBuild/startParquetCopyBuild.ts";
import { describe, expect, it, vi } from "vitest";

const TARGET = {
  serverUrl: "https://pipeline.example/",
  serverSecret: "server-secret",
  supabaseUrl: "https://abcd.supabase.co",
  serviceRoleKey: "service-role-key",
};
const LISTING_ID = "e8ad4499-10e1-47d7-9a34-64e6ea79a8e6";
const BUILD_ID = "9f1d2c3b-0000-4000-8000-000000000002";

function _env(values: Record<string, string>) {
  return (name: string): string | undefined => {
    return values[name];
  };
}

describe("startParquetCopyBuild", () => {
  it("asks the pipeline server to build the listing's copy", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true, isQueued: true }), {
        status: 202,
      });
    });

    await startParquetCopyBuild({
      target: TARGET,
      catalogListingId: LISTING_ID,
      buildId: BUILD_ID,
      fetchImpl,
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect([url, init.method, JSON.parse(String(init.body))]).toEqual([
      `https://pipeline.example/open-data-cache/${LISTING_ID}/build`,
      "POST",
      { buildId: BUILD_ID },
    ]);
    expect(init.headers).toMatchObject({
      authorization: "Bearer server-secret",
      "x-ava-supabase-url": "https://abcd.supabase.co",
      "x-ava-supabase-service-role-key": "service-role-key",
    });
  });

  it("hands the pipeline server a complete sample to copy instead of the source", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ ok: true, isQueued: true }), {
        status: 202,
      });
    });

    await startParquetCopyBuild({
      target: TARGET,
      catalogListingId: LISTING_ID,
      buildId: BUILD_ID,
      completeSampleCsv: "borocode\n1\n",
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(String(init.body))).toEqual({
      buildId: BUILD_ID,
      completeSampleCsv: "borocode\n1\n",
    });
  });

  it("throws when the pipeline server refuses, without repeating the key", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("nope", { status: 401 });
    });

    await expect(
      startParquetCopyBuild({
        target: TARGET,
        catalogListingId: LISTING_ID,
        buildId: BUILD_ID,
        fetchImpl,
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringMatching(/401/),
      }),
    );
  });
});

describe("readPipelineServerTarget", () => {
  const ENV = {
    AVA_PIPELINE_SERVER_URL: "https://pipeline.example",
    AVA_PIPELINE_SERVER_SECRET: "server-secret",
    SUPABASE_URL: "http://kong:8000",
    SB_SECRET_KEY: "service-role-key",
  };

  it("reads the server and this project from the environment", () => {
    expect(readPipelineServerTarget(_env(ENV))).toEqual({
      serverUrl: "https://pipeline.example",
      serverSecret: "server-secret",
      supabaseUrl: "http://kong:8000",
      serviceRoleKey: "service-role-key",
    });
  });

  it("sends the project URL the server can reach, when one is set", () => {
    expect(
      readPipelineServerTarget(
        _env({
          ...ENV,
          AVA_PIPELINE_SERVER_SUPABASE_URL: "http://127.0.0.1:54321",
        }),
      )?.supabaseUrl,
    ).toBe("http://127.0.0.1:54321");
  });

  it.each(["AVA_PIPELINE_SERVER_URL", "AVA_PIPELINE_SERVER_SECRET"])(
    "is undefined without %s",
    (name) => {
      expect(
        readPipelineServerTarget(_env({ ...ENV, [name]: "" })),
      ).toBeUndefined();
    },
  );
});
