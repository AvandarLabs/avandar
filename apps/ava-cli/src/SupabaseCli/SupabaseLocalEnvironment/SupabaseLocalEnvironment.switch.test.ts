import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  BRANCH,
  CONFIG_PATH,
  EDGE_ENV_PATH,
  ENV_PATH,
  ORIGINAL_CONFIG,
  ORIGINAL_ENV,
  PROJECT_ROOT,
  SupabaseLocalEnvironmentFakeIo,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIo/SupabaseLocalEnvironmentFakeIo";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { prop, propEq, propPasses, valEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";

const { create: createFakeIo } = SupabaseLocalEnvironmentFakeIo;
const {
  createGate,
  makeBackupDirectory,
  makeBackupHierarchy,
  makeBackupPathFromSourcePath: makeBackupPath,
} = SupabaseLocalEnvironmentFixtures;

describe("SupabaseLocalEnvironment.switch (guards and backup safety)", () => {
  it("refuses a detached HEAD before creating a backup", async () => {
    const fake = createFakeIo({ branch: "" });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("requires a named Git branch");
    expect(fake.copyOperations).toEqual([]);
  });

  it("rejects an unsafe project id before creating a backup", async () => {
    const fake = createFakeIo();
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "../shared",
      }),
    ).rejects.toThrow("letters, numbers, hyphens, and underscores");
    expect(fake.copyOperations).toEqual([]);
  });

  it("refuses a project id already owned by local Docker resources", async () => {
    const fake = createFakeIo({ hasSupabaseResources: true });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "another-agents-stack",
      }),
    ).rejects.toThrow("already belongs to another local Supabase stack");
    expect(fake.copyOperations).toEqual([]);
    expect(fake.commands).toEqual([]);
  });

  it("refuses to reuse the current Supabase project id", async () => {
    const fake = createFakeIo();
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "avandar",
      }),
    ).rejects.toThrow("must differ from the current id");
    expect(fake.copyOperations).toEqual([]);
  });

  it("refuses a second switch for the same branch", async () => {
    const fake = createFakeIo();
    makeBackupHierarchy().forEach((directoryPath) => {
      fake.directories.add(directoryPath);
    });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("Run ava supabase restore first");
    expect(fake.commands).toEqual([]);
  });

  it("atomically allows only one concurrent switch for the same pair", async () => {
    const fake = createFakeIo({ beforeReserve: createGate(2) });

    const results = await Promise.allSettled([
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ]);

    expect(results.filter(propEq("status", "fulfilled"))).toHaveLength(1);
    const rejectedResult = results.find(propEq("status", "rejected"));
    expect(rejectedResult).toEqual(
      expect.objectContaining({
        reason: expect.objectContaining({
          message: expect.stringContaining("Run ava supabase restore first"),
        }),
      }),
    );
    expect(
      fake.commands.filter(([command]) => {
        return command === "start";
      }),
    ).toHaveLength(1);
    expect(
      fake.commands.filter(([command]) => {
        return command === "stop";
      }),
    ).toHaveLength(0);
    expect(fake.operations.filter(valEq(`write:${CONFIG_PATH}`))).toHaveLength(
      1,
    );
  });

  it("skips a Docker-published port set when choosing an automatic base", async () => {
    const fake = createFakeIo({ publishedHostPorts: [55322] });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).resolves.toEqual({
      basePort: 55341,
      devServerPort: 6193,
      projectId: "analytics-p2-temp",
      seed: { state: "seeded" },
    });
    expect(fake.files.get(CONFIG_PATH)).toContain("port = 55341");
    expect(fake.files.get(CONFIG_PATH)).toContain("port = 55342");
  });

  it("ignores a backup belonging to another branch", async () => {
    const fake = createFakeIo();
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
    ).resolves.toEqual({
      basePort: 55321,
      devServerPort: 6173,
      projectId: "analytics-p2-temp",
      seed: { state: "seeded" },
    });
  });

  it("ignores a same-branch backup belonging to another worktree", async () => {
    const fake = createFakeIo();
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
    ).resolves.toEqual({
      basePort: 55321,
      devServerPort: 6173,
      projectId: "analytics-p2-temp",
      seed: { state: "seeded" },
    });
  });

  it("backs up every development file before rewriting configuration", async () => {
    const fake = createFakeIo();
    await SupabaseLocalEnvironment.switch({
      io: fake.io,
      temporaryProjectId: "analytics-p2-temp",
    });
    expect(fake.copyOperations.map(prop("0")).sort()).toEqual(
      [CONFIG_PATH, EDGE_ENV_PATH, ENV_PATH].sort(),
    );
    const configWriteIndex = fake.operations.indexOf(`write:${CONFIG_PATH}`);
    const lastCopyIndex = Math.max(
      ...fake.operations
        .map((operation, index) => {
          return { operation, index };
        })
        .filter(
          propPasses("operation", (operation): operation is string => {
            return operation.startsWith("copy:");
          }),
        )
        .map(prop("index")),
    );
    expect(lastCopyIndex).toBeLessThan(configWriteIndex);
  });

  it("refuses an externally retargeted backup hierarchy parent", async () => {
    const avaDirectory = `${PROJECT_ROOT}/.ava`;
    const fake = createFakeIo({
      canonicalPaths: { [avaDirectory]: "/outside/.ava" },
    });
    fake.directories.add(avaDirectory);

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("deterministic backup hierarchy");
    expect(fake.copyOperations).toEqual([]);
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses an in-worktree retargeted backup hierarchy parent", async () => {
    const supabaseBackupRoot = `${PROJECT_ROOT}/.ava/backups/supabase`;
    const fake = createFakeIo({
      canonicalPaths: {
        [supabaseBackupRoot]: `${PROJECT_ROOT}/retargeted/supabase`,
      },
    });
    makeBackupHierarchy()
      .slice(0, 3)
      .forEach((directoryPath) => {
        fake.directories.add(directoryPath);
      });

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("deterministic backup hierarchy");
    expect(fake.copyOperations).toEqual([]);
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a config symlink that escapes the canonical worktree", async () => {
    const fake = createFakeIo({
      canonicalPaths: { [CONFIG_PATH]: "/outside/config.toml" },
    });

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("deterministic regular file");
    expect(fake.commands).toEqual([]);
    expect(fake.copyOperations).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses an environment symlink retargeted inside the worktree", async () => {
    const fake = createFakeIo({
      canonicalPaths: { [ENV_PATH]: `${PROJECT_ROOT}/nested/environment` },
    });

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("deterministic regular file");
    expect(fake.commands).toEqual([]);
    expect(fake.copyOperations).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a discovered environment path outside the worktree", async () => {
    const externalEnvPath = "/outside/.env.development";
    const fake = createFakeIo({ developmentEnvFiles: [externalEnvPath] });
    fake.files.set(externalEnvPath, ORIGINAL_ENV);

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("deterministic regular file");
    expect(fake.commands).toEqual([]);
    expect(fake.copyOperations).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a config directory before reserving or writing", async () => {
    const fake = createFakeIo();
    fake.files.delete(CONFIG_PATH);
    fake.directories.add(CONFIG_PATH);

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("deterministic regular file");
    expect(fake.commands).toEqual([]);
    expect(fake.copyOperations).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses an environment directory before reserving or writing", async () => {
    const fake = createFakeIo({ developmentEnvFiles: [ENV_PATH] });
    fake.files.delete(ENV_PATH);
    fake.directories.add(ENV_PATH);

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow("deterministic regular file");
    expect(fake.commands).toEqual([]);
    expect(fake.copyOperations).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("removes a partial backup when copying a source file fails", async () => {
    const fake = createFakeIo({ copyFailureTarget: makeBackupPath(ENV_PATH) });
    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow(`Cannot copy to ${makeBackupPath(ENV_PATH)}`);
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
    expect(fake.commands).toEqual([]);
  });

  it("removes a partial backup when backup directory creation fails", async () => {
    const filesDirectory = `${makeBackupDirectory()}/files`;
    const fake = createFakeIo({
      makeDirectoryFailureTarget: filesDirectory,
    });

    await expect(
      SupabaseLocalEnvironment.switch({
        io: fake.io,
        temporaryProjectId: "analytics-p2-temp",
      }),
    ).rejects.toThrow(`Cannot create ${filesDirectory}`);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
    expect(fake.commands).toEqual([]);
  });

  it("retains manifest-write and backup-removal errors with the recovery path", async () => {
    const manifestPath = `${makeBackupDirectory()}/manifest.json`;
    const fake = createFakeIo({
      writeFailureTarget: manifestPath,
      removeFailureTarget: makeBackupDirectory(),
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
    expect(error.message).toContain(
      `Backup retained at ${makeBackupDirectory()}`,
    );
    expect(error.errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("Cannot write"),
      }),
      expect.objectContaining({
        message: expect.stringContaining("Cannot remove"),
      }),
    ]);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(true);
    expect(fake.commands).toEqual([]);
  });
});
