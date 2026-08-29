/**
 * CLI switch flow: default id from the branch, one switch per branch.
 */
import { SupabaseLocalEnvironmentFakeIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIo/SupabaseLocalEnvironmentFakeIo";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { runSupabaseSwitch } from "@ava-cli/SupabaseCli/SupabaseSwitchCli/runSupabaseSwitch/runSupabaseSwitch";
import { describe, expect, it, vi } from "vitest";

const { create: createFakeIo } = SupabaseLocalEnvironmentFakeIo;
const { seedActiveBackup } = SupabaseLocalEnvironmentFixtures;

describe("runSupabaseSwitch", () => {
  it("creates a kebab-cased project id from the branch when none is given", async () => {
    const fake = createFakeIo();
    const confirmReuse = vi.fn();

    const outcome = await runSupabaseSwitch({
      io: fake.io,
      confirmReuse,
    });

    expect(outcome).toMatchObject({
      kind: "switched",
      result: { projectId: "feat-analytics-p2" },
    });
    expect(confirmReuse).not.toHaveBeenCalled();
  });

  it("creates the requested project id when this branch has no switch", async () => {
    const fake = createFakeIo();

    const outcome = await runSupabaseSwitch({
      io: fake.io,
      requestedProjectId: "feat-other",
      confirmReuse: vi.fn(),
    });

    expect(outcome).toMatchObject({
      kind: "switched",
      result: { projectId: "feat-other" },
    });
  });

  it("starts the existing switch when the requested id matches it", async () => {
    const fake = createFakeIo();
    seedActiveBackup(fake);
    const confirmReuse = vi.fn();

    const outcome = await runSupabaseSwitch({
      io: fake.io,
      requestedProjectId: "analytics-p2-temp",
      confirmReuse,
    });

    expect(outcome).toEqual({
      kind: "switched",
      result: {
        basePort: 55321,
        devServerPort: 5173,
        projectId: "analytics-p2-temp",
        seed: { state: "unchanged" },
      },
    });
    expect(confirmReuse).not.toHaveBeenCalled();
    expect(fake.commands[0]).toEqual(["start"]);
  });

  it("asks before reusing when a different id is requested, and reuses on yes", async () => {
    const fake = createFakeIo();
    seedActiveBackup(fake);
    const confirmReuse = vi.fn(async () => {
      return true;
    });

    const outcome = await runSupabaseSwitch({
      io: fake.io,
      requestedProjectId: "feat-other",
      confirmReuse,
    });

    expect(confirmReuse).toHaveBeenCalledWith("analytics-p2-temp");
    expect(outcome).toMatchObject({
      kind: "switched",
      result: { projectId: "analytics-p2-temp", seed: { state: "unchanged" } },
    });
  });

  it("declines a second switch when the user does not reuse the existing one", async () => {
    const fake = createFakeIo();
    seedActiveBackup(fake);
    const confirmReuse = vi.fn(async () => {
      return false;
    });

    const outcome = await runSupabaseSwitch({
      io: fake.io,
      requestedProjectId: "feat-other",
      confirmReuse,
    });

    expect(outcome).toEqual({
      kind: "declined",
      existingProjectId: "analytics-p2-temp",
    });
    expect(fake.commands).toEqual([]);
  });

  it("asks before reusing when no id is given and a switch already exists", async () => {
    const fake = createFakeIo();
    seedActiveBackup(fake);
    const confirmReuse = vi.fn(async () => {
      return false;
    });

    const outcome = await runSupabaseSwitch({
      io: fake.io,
      confirmReuse,
    });

    expect(confirmReuse).toHaveBeenCalledWith("analytics-p2-temp");
    expect(outcome).toEqual({
      kind: "declined",
      existingProjectId: "analytics-p2-temp",
    });
  });

  it("does not invent a branch id without a named Git branch", async () => {
    const fake = createFakeIo({ branch: "" });
    await expect(
      runSupabaseSwitch({
        io: fake.io,
        confirmReuse: vi.fn(),
      }),
    ).rejects.toThrow("requires a named Git branch");
  });
});
