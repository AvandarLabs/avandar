import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  BRANCH,
  CONFIG_PATH,
  ENV_PATH,
  ORIGINAL_CONFIG,
  ORIGINAL_ENV,
  SupabaseLocalEnvironmentFakeIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { describe, expect, it } from "vitest";

const { create: createFakeIO } = SupabaseLocalEnvironmentFakeIO;
const { makeBackupDirectory, makeBackupHierarchy } =
  SupabaseLocalEnvironmentFixtures;

describe("SupabaseLocalEnvironment.switch (startup and rollback)", () => {
  it("starts before reading status and rewriting environments", async () => {
    const fake = createFakeIO();
    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });
    expect(fake.operations.indexOf("command:start")).toBeLessThan(
      fake.operations.indexOf("command:status -o json"),
    );
    expect(fake.operations.indexOf("command:status -o json")).toBeLessThan(
      fake.operations.indexOf(`write:${ENV_PATH}`),
    );
  });

  it("rolls back files without invoking project-wide stop when startup fails", async () => {
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
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.files.get(ENV_PATH)).toBe(ORIGINAL_ENV);
    expect(fake.commands).not.toContainEqual([
      "stop",
      "--project-id",
      "analytics-p2-temp",
      "--no-backup",
    ]);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
  });

  it("does not include status stdout in a failure", async () => {
    const fake = createFakeIO({
      commandResults: {
        "status -o json": {
          ok: false,
          stdout: "SECRET_KEY=must-not-leak",
          stderr: "status failed",
        },
      },
    });
    const switchPromise = SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });
    await expect(switchPromise).rejects.toThrow("Supabase status failed");
    await expect(switchPromise).rejects.not.toThrow("must-not-leak");
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
  });

  it("preserves cleanup and restoration errors during switch rollback", async () => {
    const fake = createFakeIO({
      copyFailureTarget: ENV_PATH,
      listResourcesError: "cleanup failed",
      commandResults: {
        start: { ok: false, stdout: "", stderr: "start failed" },
      },
    });

    const error = await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    }).catch((caughtError: unknown) => {
      return caughtError;
    });

    expect(error).toBeInstanceOf(AggregateError);
    if (!(error instanceof AggregateError)) {
      throw new Error("Expected an AggregateError.");
    }
    expect(error.message).toContain("manual cleanup is required");
    expect(error.errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("start failed"),
      }),
      expect.objectContaining({ message: "cleanup failed" }),
      expect.objectContaining({
        message: expect.stringContaining("Cannot copy"),
      }),
    ]);
  });

  it("preserves cleanup and backup-removal errors during switch rollback", async () => {
    const fake = createFakeIO({
      removeFailureTarget: makeBackupDirectory(),
      listResourcesError: "cleanup failed",
      commandResults: {
        start: { ok: false, stdout: "", stderr: "start failed" },
      },
    });

    const error = await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    }).catch((caughtError: unknown) => {
      return caughtError;
    });

    expect(error).toBeInstanceOf(AggregateError);
    if (!(error instanceof AggregateError)) {
      throw new Error("Expected an AggregateError.");
    }
    expect(error.message).toContain("manual cleanup is required");
    expect(error.errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("start failed"),
      }),
      expect.objectContaining({ message: "cleanup failed" }),
      expect.objectContaining({
        message: expect.stringContaining("Cannot remove"),
      }),
    ]);
  });

  it("preserves another branch backup during switch rollback", async () => {
    const otherBackupDirectory = makeBackupDirectory({
      branch: "feat/other-work",
    });
    const fake = createFakeIO({
      commandResults: {
        start: { ok: false, stdout: "", stderr: "start failed" },
      },
    });
    makeBackupHierarchy({ branch: "feat/other-work" }).forEach(
      (directoryPath) => {
        fake.directories.add(directoryPath);
      },
    );

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("Supabase start failed");
    await expect(fake.io.pathExists(otherBackupDirectory)).resolves.toBe(true);
  });

  it("preserves another worktree backup during switch rollback", async () => {
    const otherBackupDirectory = makeBackupDirectory({
      branch: BRANCH,
      worktreePath: "/repo-copy",
    });
    const fake = createFakeIO({
      commandResults: {
        start: { ok: false, stdout: "", stderr: "start failed" },
      },
    });
    makeBackupHierarchy({ branch: BRANCH, worktreePath: "/repo-copy" }).forEach(
      (directoryPath) => {
        fake.directories.add(directoryPath);
      },
    );

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("Supabase start failed");
    await expect(fake.io.pathExists(otherBackupDirectory)).resolves.toBe(true);
  });
});
