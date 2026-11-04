import { DevServerPort } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/DevServerPort/DevServerPort";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupPaths";
import { SupabaseBackupStore } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupStore";
import { promiseMap } from "@avandar/utils";
import type {
  CommandResult,
  SupabaseBackupManifest,
  SupabaseLocalEnvironmentIo,
  SupabaseSwitchResult,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

function _requireCommandSuccess(
  options: Readonly<{ result: Readonly<CommandResult>; stage: string }>,
): void {
  const { result, stage } = options;
  if (!result.ok) {
    throw new Error(`${stage} failed: ${result.stderr || "unknown error"}`);
  }
}

async function _readExistingManifest(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<{ branch: string; manifest: SupabaseBackupManifest } | undefined> {
  const branch = await io.readBranch();
  if (branch === "") {
    return undefined;
  }
  const worktreePath = await io.readWorktreePath();
  try {
    return {
      branch,
      manifest: await SupabaseBackupStore.readManifest({
        io,
        backupDirectory: SupabaseBackupPaths.backupDirectory({
          projectRoot: io.projectRoot,
          branch,
          worktreePath,
        }),
      }),
    };
  } catch {
    return undefined;
  }
}

/**
 * Starts this branch's existing isolated Supabase project without creating a
 * second switch.
 */
export async function startExistingSwitch(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<SupabaseSwitchResult> {
  const existing = await _readExistingManifest(io);
  if (existing === undefined) {
    const branch = await io.readBranch();
    throw new Error(`Branch ${branch} has no active Supabase switch.`);
  }
  if (existing.manifest.kind === "remote") {
    throw new Error(
      `Branch ${existing.branch} is switched to the hosted project ${existing.manifest.remoteProjectId}, so there is no local project to start. Run \`ava supabase restore\` first.`,
    );
  }
  _requireCommandSuccess({
    result: await io.runSupabase(["start"]),
    stage: "Supabase start",
  });
  const statusResult = await io.runSupabase(["status", "-o", "json"]);
  _requireCommandSuccess({ result: statusResult, stage: "Supabase status" });
  const envFiles = await io.findDevelopmentEnvFiles();
  const envContentsList = await promiseMap(envFiles, (envFile) => {
    return io.readTextFile(envFile);
  });
  return {
    basePort: existing.manifest.basePort,
    devServerPort: DevServerPort.fromEnvFiles(envContentsList),
    projectId: existing.manifest.temporaryProjectId,
    seed: { state: "unchanged" },
  };
}

/**
 * Returns the project this branch's existing switch points at, local or
 * hosted, if a switch left a backup behind.
 */
export async function readExistingSwitchProject(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<{ kind: "local" | "remote"; projectId: string } | undefined> {
  const existing = await _readExistingManifest(io);
  if (existing === undefined) {
    return undefined;
  }
  return existing.manifest.kind === "local"
    ? { kind: "local", projectId: existing.manifest.temporaryProjectId }
    : { kind: "remote", projectId: existing.manifest.remoteProjectId };
}
