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
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIo/SupabaseLocalEnvironmentFakeIo";
import type {
  SupabaseBackupManifest,
  SupabaseLocalBackupManifest,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { FakeHarness } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironmentFakeIo/SupabaseLocalEnvironmentFakeIo";

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

/** The `.env.development` a switch to `analytics-p2-temp` leaves behind. */
const SWITCHED_ENV = `VITE_SUPABASE_API_URL=temp

# >>> ava supabase switch >>>
SUPABASE_PROJECT_ID=analytics-p2-temp
SUPABASE_API_PORT=55321
SUPABASE_DB_PORT=55322
# <<< ava supabase switch <<<
`;

function _seedBackupFiles(
  options: Readonly<{ fake: FakeHarness; sourcePaths: readonly string[] }>,
): void {
  const { fake, sourcePaths } = options;
  const manifest: SupabaseLocalBackupManifest = {
    kind: "local",
    branch: BRANCH,
    worktreePath: PROJECT_ROOT,
    temporaryProjectId: "analytics-p2-temp",
    basePort: 55321,
    derivedPorts: { "api.port": 55321, "db.port": 55322 },
    files: sourcePaths.map((sourcePath) => {
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
  const originalContents: Record<string, string> = {
    [CONFIG_PATH]: ORIGINAL_CONFIG,
    [ENV_PATH]: ORIGINAL_ENV,
    [EDGE_ENV_PATH]: ORIGINAL_EDGE_ENV,
  };
  sourcePaths.forEach((sourcePath) => {
    fake.files.set(
      _makeBackupPathFromSourcePath(sourcePath),
      originalContents[sourcePath] ?? "",
    );
  });
  fake.files.set(
    `${_makeBackupDirectory()}/manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fake.files.set(EDGE_ENV_PATH, "SB_SECRET_KEY=temp\n");
}

function _seedActiveBackup(fake: FakeHarness): void {
  _seedBackupFiles({ fake, sourcePaths: [ENV_PATH, EDGE_ENV_PATH] });
  fake.files.set(ENV_PATH, SWITCHED_ENV);
}

function _seedLegacyActiveBackup(fake: FakeHarness): void {
  _seedBackupFiles({
    fake,
    sourcePaths: [CONFIG_PATH, ENV_PATH, EDGE_ENV_PATH],
  });
  fake.files.set(
    CONFIG_PATH,
    ORIGINAL_CONFIG.replace('"avandar"', '"analytics-p2-temp"'),
  );
  fake.files.set(ENV_PATH, "VITE_SUPABASE_API_URL=temp\n");
}

/** Reads the seeded manifest, which the fixtures always write as local. */
function _readFakeManifest(
  fake: Readonly<FakeHarness>,
): SupabaseLocalBackupManifest {
  return JSON.parse(
    fake.files.get(`${_makeBackupDirectory()}/manifest.json`) ?? "{}",
  ) as SupabaseLocalBackupManifest;
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

  /** Seeds an active switch whose overrides live in `.env.development`. */
  seedActiveBackup: _seedActiveBackup,

  /**
   * Seeds an active switch that rewrote `supabase/config.toml` instead, the
   * way worktrees switched by an older `ava` still look on disk.
   */
  seedLegacyActiveBackup: _seedLegacyActiveBackup,

  /** Reads the current manifest from a fake harness. */
  readFakeManifest: _readFakeManifest,

  /** Returns a writer for the fake harness manifest. */
  writeFakeManifest: _writeFakeManifest,

  /** Marks a seeded fake backup as an interrupted switch. */
  markBackupSwitching: _markBackupSwitching,

  /** Creates an async gate released after the required arrivals. */
  createGate: _createGate,
};
