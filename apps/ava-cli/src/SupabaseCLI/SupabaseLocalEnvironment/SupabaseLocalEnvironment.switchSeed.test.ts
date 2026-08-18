import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  CONFIG_PATH,
  ENV_PATH,
  ORIGINAL_CONFIG,
  SupabaseLocalEnvironmentFakeIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO";
import { describe, expect, it } from "vitest";

const { create: createFakeIO } = SupabaseLocalEnvironmentFakeIO;

/** The connection the fake `supabase status` reports for the new stack. */
const NEW_STACK_SEED_TARGET = {
  supabaseUrl: "http://127.0.0.1:55321",
  serviceRoleKey: "secret",
};

describe("SupabaseLocalEnvironment.switch (seeding)", () => {
  it("seeds the stack the switch just started", async () => {
    const fake = createFakeIO();
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).resolves.toMatchObject({ seed: { state: "seeded" } });
    expect(fake.seedTargets).toEqual([NEW_STACK_SEED_TARGET]);
  });

  it("seeds only once the switch has finished writing its files", async () => {
    const fake = createFakeIO();
    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });
    expect(fake.operations.indexOf(`write:${ENV_PATH}`)).toBeLessThan(
      fake.operations.indexOf(`seed:${NEW_STACK_SEED_TARGET.supabaseUrl}`),
    );
  });

  it("leaves the database unseeded when the seed is skipped", async () => {
    const fake = createFakeIO();
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
        skipSeed: true,
      }),
    ).resolves.toMatchObject({ seed: { state: "skipped" } });
    expect(fake.seedTargets).toEqual([]);
  });

  it("keeps the switched project when the seed fails", async () => {
    const fake = createFakeIO({
      seedResult: { ok: false, stdout: "", stderr: "seed job blew up" },
    });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).resolves.toMatchObject({
      projectId: "analytics-p2-temp",
      seed: { state: "failed", message: "seed job blew up" },
    });
    expect(fake.files.get(CONFIG_PATH)).not.toBe(ORIGINAL_CONFIG);
    expect(fake.removedResources).toEqual([]);
  });

  it("reports a seed that could not be launched as a failure", async () => {
    const fake = createFakeIO({ seedError: "pnpm is not installed" });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).resolves.toMatchObject({
      seed: { state: "failed", message: "pnpm is not installed" },
    });
  });

  it("does not seed a switch that rolled back", async () => {
    const fake = createFakeIO({
      commandResults: {
        start: { ok: false, stdout: "", stderr: "start failed" },
      },
    });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("Supabase start failed");
    expect(fake.seedTargets).toEqual([]);
  });
});
