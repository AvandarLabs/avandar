/**
 * Starts this branch's existing switch without creating a second project.
 */
import { startExistingSwitch } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/startExistingSwitch/startExistingSwitch";
import { SupabaseLocalEnvironmentFakeIO } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { describe, expect, it } from "vitest";

const { create: createFakeIO } = SupabaseLocalEnvironmentFakeIO;
const { seedActiveBackup } = SupabaseLocalEnvironmentFixtures;

describe("startExistingSwitch", () => {
  it("starts the existing project without creating a new backup", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const copyCountBefore = fake.copyOperations.length;

    await expect(startExistingSwitch(fake.io)).resolves.toEqual({
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
    const fake = createFakeIO();
    await expect(startExistingSwitch(fake.io)).rejects.toThrow(
      "has no active Supabase switch",
    );
    expect(fake.commands).toEqual([]);
  });
});
