import { createSocrataEtlEngine } from "@pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine";
import { run } from "@pipelines/socrata/run";
import { describe, expect, it, vi } from "vitest";

const engineRun = vi.hoisted(() => {
  return vi.fn();
});

vi.mock(
  "@pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine",
  () => {
    return {
      createSocrataEtlEngine: vi.fn(() => {
        return { run: engineRun, listScopes: vi.fn() };
      }),
    };
  },
);

describe("socrata run", () => {
  it("loads into the run's Supabase project, and keeps it out of the engine's options", async () => {
    const supabase = {
      url: "https://abcd.supabase.co",
      serviceRoleKey: "service-role-key",
    };

    await run({ mode: "full", limit: 1, supabase });

    expect(vi.mocked(createSocrataEtlEngine).mock.calls[0]?.[0]).toMatchObject({
      supabase,
    });
    expect(engineRun).toHaveBeenCalledWith({ mode: "full", limit: 1 });
  });
});
