/**
 * Starts this branch's existing switch without creating a second project.
 */
import { ExistingSwitch } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/ExistingSwitch/ExistingSwitch";
import { SupabaseLocalEnvironmentFakeIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIo/SupabaseLocalEnvironmentFakeIo";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { describe, expect, it } from "vitest";

const { create: createFakeIo } = SupabaseLocalEnvironmentFakeIo;
const { seedActiveBackup } = SupabaseLocalEnvironmentFixtures;

describe("ExistingSwitch.start", () => {
  it("starts the existing project without creating a new backup", async () => {
    const fake = createFakeIo();
    seedActiveBackup(fake);
    const copyCountBefore = fake.copyOperations.length;

    await expect(ExistingSwitch.start(fake.io)).resolves.toEqual({
      basePort: 55321,
      devServerPort: 5173,
      projectId: "analytics-p2-temp",
      seed: { state: "unchanged" },
    });

    expect(fake.commands).toEqual([["start"], ["status", "-o", "json"]]);
    expect(fake.copyOperations).toHaveLength(copyCountBefore);
    expect(fake.seedTargets).toEqual([]);
  });

  it("refuses when this branch has no switch", async () => {
    const fake = createFakeIo();
    await expect(ExistingSwitch.start(fake.io)).rejects.toThrow(
      "has no active Supabase switch",
    );
    expect(fake.commands).toEqual([]);
  });
});
