import { createHdxEtlEngine } from "@pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine";
import { run } from "@pipelines/hdx/run";
import { describe, expect, it, vi } from "vitest";

const engineRun = vi.hoisted(() => {
  return vi.fn();
});

vi.mock("@pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine", () => {
  return {
    createHdxEtlEngine: vi.fn(() => {
      return { run: engineRun, listScopes: vi.fn() };
    }),
  };
});

describe("hdx run", () => {
  it("loads into the run's Supabase project, and keeps it out of the engine's options", async () => {
    const supabase = {
      url: "https://abcd.supabase.co",
      serviceRoleKey: "service-role-key",
    };

    await run({ mode: "full", limit: 1, supabase });

    expect(vi.mocked(createHdxEtlEngine).mock.calls[0]?.[0]).toMatchObject({
      supabase,
    });
    expect(engineRun).toHaveBeenCalledWith({ mode: "full", limit: 1 });
  });
});
