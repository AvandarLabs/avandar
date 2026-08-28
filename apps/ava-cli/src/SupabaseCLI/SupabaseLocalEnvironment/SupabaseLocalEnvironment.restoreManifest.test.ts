import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  CONFIG_PATH,
  EDGE_ENV_PATH,
  ENV_PATH,
  ORIGINAL_ENV,
  PROJECT_ROOT,
  SupabaseLocalEnvironmentFakeIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO/SupabaseLocalEnvironmentFakeIO";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { propNotEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";

const { create: createFakeIO } = SupabaseLocalEnvironmentFakeIO;
const {
  makeBackupDirectory,
  makeBackupPathFromSourcePath: makeBackupPath,
  readFakeManifest,
  seedActiveBackup,
  writeFakeManifest,
} = SupabaseLocalEnvironmentFixtures;

describe("SupabaseLocalEnvironment.restore (manifest validation)", () => {
  it("refuses a manifest file whose canonical target escapes its directory", async () => {
    const manifestPath = `${makeBackupDirectory()}/manifest.json`;
    const fake = createFakeIO({
      canonicalPaths: { [manifestPath]: "/outside/manifest.json" },
    });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "canonical manifest path outside the backup directory",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses malformed manifest JSON before running a command", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    fake.files.set(`${makeBackupDirectory()}/manifest.json`, "not-json");

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow();
    expect(fake.commands).toEqual([]);
  });

  it("refuses an unsafe manifest project id before running a command", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    writeFakeManifest(fake)({
      ...readFakeManifest(fake),
      temporaryProjectId: "--all",
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "unsafe temporary project id",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a manifest project id that differs from the active config", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    writeFakeManifest(fake)({
      ...readFakeManifest(fake),
      temporaryProjectId: "another-stack",
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "does not match the active Supabase config",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a manifest that omits the config backup", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: manifest.files.filter(propNotEq("sourcePath", CONFIG_PATH)),
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "complete deterministic file set",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses paired deletion of the config manifest row and backup", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: manifest.files.filter(propNotEq("sourcePath", CONFIG_PATH)),
    });
    fake.files.delete(makeBackupPath(CONFIG_PATH));

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "must include the config backup",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a manifest that omits a development environment backup", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: manifest.files.filter(propNotEq("sourcePath", EDGE_ENV_PATH)),
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "complete deterministic file set",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses paired deletion of a current environment row and backup", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: manifest.files.filter(propNotEq("sourcePath", EDGE_ENV_PATH)),
    });
    fake.files.delete(makeBackupPath(EDGE_ENV_PATH));

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "must include every current development environment",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a manifest with an unexpected source file", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const unexpectedSourcePath = `${PROJECT_ROOT}/unexpected.txt`;
    const unexpectedBackupPath = makeBackupPath(unexpectedSourcePath);
    fake.files.set(unexpectedBackupPath, "UNEXPECTED=value\n");
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: [
        ...manifest.files,
        {
          sourcePath: unexpectedSourcePath,
          backupPath: unexpectedBackupPath,
        },
      ],
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "complete deterministic file set",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses an unexpected orphaned backup entry", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const unexpectedSourcePath = `${PROJECT_ROOT}/unexpected.txt`;
    fake.files.set(makeBackupPath(unexpectedSourcePath), "unexpected\n");

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "complete deterministic file set",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses duplicate manifest source paths", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: [...manifest.files, manifest.files[0]!],
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "duplicate source paths",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses duplicate manifest backup paths", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: manifest.files.map((backupFile) => {
        return backupFile.sourcePath === EDGE_ENV_PATH
          ? { ...backupFile, backupPath: makeBackupPath(ENV_PATH) }
          : backupFile;
      }),
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "duplicate backup paths",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses a non-deterministic manifest backup path", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const unexpectedBackupPath = `${makeBackupDirectory()}/files/unexpected`;
    fake.files.set(unexpectedBackupPath, ORIGINAL_ENV);
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: manifest.files.map((backupFile) => {
        return backupFile.sourcePath === ENV_PATH
          ? { ...backupFile, backupPath: unexpectedBackupPath }
          : backupFile;
      }),
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "complete deterministic file set",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses a manifest whose backup file is missing", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    fake.files.delete(makeBackupPath(ENV_PATH));

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "missing backup file",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses a manifest whose backup entry is not a file", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const backupPath = makeBackupPath(ENV_PATH);
    fake.files.delete(backupPath);
    fake.directories.add(backupPath);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "missing backup file",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses a source path whose canonical target escapes the worktree", async () => {
    const fake = createFakeIO({
      canonicalPaths: { [ENV_PATH]: "/outside/source" },
    });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "canonical source path outside the worktree",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses a backup path whose canonical target escapes its directory", async () => {
    const fake = createFakeIO({
      canonicalPaths: { [makeBackupPath(ENV_PATH)]: "/outside/backup" },
    });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "canonical backup path outside the backup directory",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses duplicate canonical source paths", async () => {
    const fake = createFakeIO({
      canonicalPaths: { [ENV_PATH]: EDGE_ENV_PATH },
    });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "duplicate canonical paths",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses a source symlink retargeted inside the worktree", async () => {
    const fake = createFakeIO({
      canonicalPaths: { [ENV_PATH]: `${PROJECT_ROOT}/nested/environment` },
    });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "canonical source does not match its destination",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a source directory before running a command", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    fake.files.delete(ENV_PATH);
    fake.directories.add(ENV_PATH);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "source is not a regular non-symlink file",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("refuses a canonical backup files directory outside its backup", async () => {
    const filesDirectory = `${makeBackupDirectory()}/files`;
    const fake = createFakeIO({
      canonicalPaths: { [filesDirectory]: "/outside/files" },
    });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "canonical backup path outside the backup directory",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses a manifest created for a different worktree", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const manifestPath = `${makeBackupDirectory()}/manifest.json`;
    const manifest = JSON.parse(fake.files.get(manifestPath) ?? "{}") as Record<
      string,
      unknown
    >;
    fake.files.set(
      manifestPath,
      `${JSON.stringify({ ...manifest, worktreePath: "/different-worktree" })}\n`,
    );
    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "belongs to worktree",
    );
    expect(fake.commands).toEqual([]);
  });

  it("refuses a manifest that would restore outside the current worktree", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    const manifestPath = `${makeBackupDirectory()}/manifest.json`;
    const manifest = JSON.parse(fake.files.get(manifestPath) ?? "{}") as Record<
      string,
      unknown
    >;
    fake.files.set(
      manifestPath,
      `${JSON.stringify({
        ...manifest,
        files: [
          { sourcePath: "/outside", backupPath: makeBackupPath(ENV_PATH) },
        ],
      })}\n`,
    );
    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "unsafe file paths",
    );
    expect(fake.commands).toEqual([]);
  });
});
