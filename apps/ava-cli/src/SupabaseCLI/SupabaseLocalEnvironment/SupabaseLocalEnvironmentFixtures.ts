import path from "node:path";
import {
  BRANCH,
  CONFIG_PATH,
  EDGE_ENV_PATH,
  ENV_PATH,
  ORIGINAL_CONFIG,
  ORIGINAL_EDGE_ENV,
  ORIGINAL_ENV,
  PROJECT_ROOT,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO/SupabaseLocalEnvironmentFakeIO";
import type { SupabaseBackupManifest } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { FakeHarness } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIO/SupabaseLocalEnvironmentFakeIO";

function _makeBackupDirectory(
  options: Readonly<{ branch?: string; worktreePath?: string }> = {},
): string {
  const { branch = BRANCH, worktreePath = PROJECT_ROOT } = options;
  const branchKey = Buffer.from(branch, "utf8").toString("base64url");
  const worktreeKey = Buffer.from(worktreePath, "utf8").toString("base64url");
  return `${PROJECT_ROOT}/.ava/backups/supabase/${branchKey}/${worktreeKey}`;
}

function _makeBackupPathFromSourcePath(sourcePath: string): string {
  const relativePath = path.relative(PROJECT_ROOT, sourcePath);
  const fileKey = Buffer.from(relativePath, "utf8").toString("base64url");
  return `${_makeBackupDirectory()}/files/${fileKey}`;
}

function _makeBackupHierarchy(
  options: Readonly<{ branch?: string; worktreePath?: string }> = {},
): string[] {
  const { branch = BRANCH, worktreePath = PROJECT_ROOT } = options;
  const branchKey = Buffer.from(branch, "utf8").toString("base64url");
  return [
    `${PROJECT_ROOT}/.ava`,
    `${PROJECT_ROOT}/.ava/backups`,
    `${PROJECT_ROOT}/.ava/backups/supabase`,
    `${PROJECT_ROOT}/.ava/backups/supabase/${branchKey}`,
    _makeBackupDirectory({ branch, worktreePath }),
  ];
}

function _seedActiveBackup(fake: FakeHarness): void {
  const backupDirectory = _makeBackupDirectory();
  const manifest: SupabaseBackupManifest = {
    branch: BRANCH,
    worktreePath: PROJECT_ROOT,
    temporaryProjectId: "analytics-p2-temp",
    basePort: 55321,
    derivedPorts: { "api.port": 55321, "db.port": 55322 },
    files: [CONFIG_PATH, ENV_PATH, EDGE_ENV_PATH].map((sourcePath) => {
      return {
        sourcePath,
        backupPath: _makeBackupPathFromSourcePath(sourcePath),
      };
    }),
    state: "active",
  };
  _makeBackupHierarchy().forEach((directoryPath) => {
    fake.directories.add(directoryPath);
  });
  fake.files.set(_makeBackupPathFromSourcePath(CONFIG_PATH), ORIGINAL_CONFIG);
  fake.files.set(_makeBackupPathFromSourcePath(ENV_PATH), ORIGINAL_ENV);
  fake.files.set(
    _makeBackupPathFromSourcePath(EDGE_ENV_PATH),
    ORIGINAL_EDGE_ENV,
  );
  fake.files.set(
    `${backupDirectory}/manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fake.files.set(
    CONFIG_PATH,
    ORIGINAL_CONFIG.replace('"avandar"', '"analytics-p2-temp"'),
  );
  fake.files.set(ENV_PATH, "VITE_SUPABASE_API_URL=temp\n");
  fake.files.set(EDGE_ENV_PATH, "SB_SECRET_KEY=temp\n");
}

function _readFakeManifest(
  fake: Readonly<FakeHarness>,
): SupabaseBackupManifest {
  return JSON.parse(
    fake.files.get(`${_makeBackupDirectory()}/manifest.json`) ?? "{}",
  ) as SupabaseBackupManifest;
}

function _writeFakeManifest(
  fake: FakeHarness,
): (manifest: Readonly<SupabaseBackupManifest>) => void {
  return (manifest) => {
    fake.files.set(
      `${_makeBackupDirectory()}/manifest.json`,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
  };
}

function _markBackupSwitching(fake: FakeHarness): void {
  _writeFakeManifest(fake)({
    ..._readFakeManifest(fake),
    state: "switching",
  });
}

function _createGate(requiredArrivals: number): () => Promise<void> {
  let arrivals = 0;
  let release: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrivals += 1;
    if (arrivals === requiredArrivals) {
      release?.();
    }
    await released;
  };
}

/** Builds and mutates branch-scoped backup fixtures for workflow tests. */
export const SupabaseLocalEnvironmentFixtures = {
  /** Returns the branch-scoped backup directory for a worktree. */
  makeBackupDirectory: _makeBackupDirectory,

  /** Returns the encoded backup path for a source file. */
  makeBackupPathFromSourcePath: _makeBackupPathFromSourcePath,

  /** Returns every directory in a branch-scoped backup hierarchy. */
  makeBackupHierarchy: _makeBackupHierarchy,

  /** Seeds an active backup and switched local environment. */
  seedActiveBackup: _seedActiveBackup,

  /** Reads the current manifest from a fake harness. */
  readFakeManifest: _readFakeManifest,

  /** Returns a writer for the fake harness manifest. */
  writeFakeManifest: _writeFakeManifest,

  /** Marks a seeded fake backup as an interrupted switch. */
  markBackupSwitching: _markBackupSwitching,

  /** Creates an async gate released after the required arrivals. */
  createGate: _createGate,
};
