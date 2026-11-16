import { createWdiEtlEngine } from "@pipelines/world-bank__wdi/createWdiEtlEngine/createWdiEtlEngine";
import { run } from "@pipelines/world-bank__wdi/run";
import { describe, expect, it, vi } from "vitest";

const engineRun = vi.hoisted(() => {
  return vi.fn();
});

vi.mock(
  "@pipelines/world-bank__wdi/createWdiEtlEngine/createWdiEtlEngine",
  () => {
    return {
      createWdiEtlEngine: vi.fn(() => {
        return { run: engineRun, listScopes: vi.fn() };
      }),
    };
  },
);

describe("world-bank__wdi run", () => {
  it("loads into the run's Supabase project, and keeps it out of the engine's options", async () => {
    const supabase = {
      url: "https://abcd.supabase.co",
      serviceRoleKey: "service-role-key",
    };

    await run({ mode: "full", limit: 1, supabase });

    expect(vi.mocked(createWdiEtlEngine).mock.calls[0]?.[0]).toMatchObject({
      supabase,
    });
    expect(engineRun).toHaveBeenCalledWith({ mode: "full", limit: 1 });
  });
});
