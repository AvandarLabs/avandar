import path from "node:path";
import { SupabaseLocalEnvironment } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment";
import {
  CONFIG_PATH,
  EDGE_ENV_PATH,
  ENV_PATH,
  ORIGINAL_CONFIG,
  ORIGINAL_ENV,
  SupabaseLocalEnvironmentFakeIO,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO/SupabaseLocalEnvironmentFakeIO";
import { SupabaseLocalEnvironmentFixtures } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFixtures";
import { propNotEq } from "@avandar/utils";
import { describe, expect, it } from "vitest";

const { create: createFakeIO } = SupabaseLocalEnvironmentFakeIO;
const {
  makeBackupDirectory,
  makeBackupPathFromSourcePath: makeBackupPath,
  markBackupSwitching,
  readFakeManifest,
  seedActiveBackup,
  writeFakeManifest,
} = SupabaseLocalEnvironmentFixtures;

describe("SupabaseLocalEnvironment.restore (interrupted-switch recovery)", () => {
  it("refuses an in-worktree retargeted backup hierarchy", async () => {
    const backupDirectory = makeBackupDirectory();
    const retargetedDirectory = `${path.dirname(backupDirectory)}/retargeted`;
    const canonicalPaths: Record<string, string> = {
      [backupDirectory]: retargetedDirectory,
      [`${backupDirectory}/files`]: `${retargetedDirectory}/files`,
      [`${backupDirectory}/manifest.json`]: `${retargetedDirectory}/manifest.json`,
    };
    [CONFIG_PATH, ENV_PATH, EDGE_ENV_PATH].forEach((sourcePath) => {
      canonicalPaths[makeBackupPath(sourcePath)] =
        `${retargetedDirectory}/files/${path.basename(makeBackupPath(sourcePath))}`;
    });
    const fake = createFakeIO({ canonicalPaths });
    seedActiveBackup(fake);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "deterministic backup hierarchy",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("recovers a switching backup when the active config is missing", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    markBackupSwitching(fake);
    fake.files.delete(CONFIG_PATH);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "ownership could not be safely proven",
    );
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.files.get(ENV_PATH)).toBe(ORIGINAL_ENV);
    expect(fake.commands).toEqual([]);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
  });

  it("recovers a switching backup when the active config is malformed", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    markBackupSwitching(fake);
    fake.files.set(CONFIG_PATH, "not valid toml = [");

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "ownership could not be safely proven",
    );
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.commands).toEqual([]);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
  });

  it("recovers a switching backup when the active project id differs", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    markBackupSwitching(fake);
    fake.files.set(CONFIG_PATH, ORIGINAL_CONFIG);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "ownership could not be safely proven",
    );
    expect(fake.files.get(CONFIG_PATH)).toBe(ORIGINAL_CONFIG);
    expect(fake.commands).toEqual([]);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(
      false,
    );
  });

  it("validates a switching backup fully before interrupted recovery", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    markBackupSwitching(fake);
    fake.files.delete(CONFIG_PATH);
    fake.files.delete(makeBackupPath(CONFIG_PATH));
    const manifest = readFakeManifest(fake);
    writeFakeManifest(fake)({
      ...manifest,
      files: manifest.files.filter(propNotEq("sourcePath", CONFIG_PATH)),
    });

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "must include the config backup",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(true);
  });

  it("retains a switching backup when interrupted recovery fails", async () => {
    const fake = createFakeIO({ copyFailureTarget: ENV_PATH });
    seedActiveBackup(fake);
    markBackupSwitching(fake);
    fake.files.delete(CONFIG_PATH);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "Backup retained",
    );
    expect(fake.commands).toEqual([]);
    await expect(fake.io.pathExists(makeBackupDirectory())).resolves.toBe(true);
  });

  it("strictly rejects a missing active config before running a command", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    fake.files.delete(CONFIG_PATH);

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "active Supabase config",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });

  it("strictly rejects a malformed active config before running a command", async () => {
    const fake = createFakeIO();
    seedActiveBackup(fake);
    fake.files.set(CONFIG_PATH, "not valid toml = [");

    await expect(SupabaseLocalEnvironment.restore(fake.io)).rejects.toThrow(
      "active Supabase config",
    );
    expect(fake.commands).toEqual([]);
    expect(fake.operations).toEqual([]);
  });
});
