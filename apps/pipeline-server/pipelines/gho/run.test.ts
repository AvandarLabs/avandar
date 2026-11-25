import { createGhoEtlEngine } from "@pipelines/gho/createGhoEtlEngine/createGhoEtlEngine";
import { run } from "@pipelines/gho/run";
import { describe, expect, it, vi } from "vitest";

const engineRun = vi.hoisted(() => {
  return vi.fn();
});

vi.mock("@pipelines/gho/createGhoEtlEngine/createGhoEtlEngine", () => {
  return {
    createGhoEtlEngine: vi.fn(() => {
      return { run: engineRun, listScopes: vi.fn() };
    }),
  };
});

describe("gho run", () => {
  it("loads into the run's Supabase project, and keeps it out of the engine's options", async () => {
    const supabase = {
      url: "https://abcd.supabase.co",
      serviceRoleKey: "service-role-key",
    };

    await run({ mode: "full", limit: 1, supabase });

    expect(vi.mocked(createGhoEtlEngine).mock.calls[0]?.[0]).toMatchObject({
      supabase,
    });
    expect(engineRun).toHaveBeenCalledWith({ mode: "full", limit: 1 });
  });

  it("crawls the one GHO drive gho.pipeline.yaml lists, with its labels", async () => {
    await run({ mode: "full" });

    expect(vi.mocked(createGhoEtlEngine).mock.lastCall?.[0].drives).toEqual([
      {
        baseUrl: "https://ghoapi.azureedge.net/api",
        organizationLabels: { 1: "Organization", 2: "Collection" },
      },
    ]);
  });
});
