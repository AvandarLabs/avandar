import path from "node:path";
import { SupabaseBackupHierarchy } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupHierarchy";
import { SupabaseBackupStore } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupStore";
import { SupabaseConfig } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { SupabaseConfigOverrides } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfigOverrides/SupabaseConfigOverrides";
import { PROJECT_ID_PATTERN } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { SupabaseSwitchPreparation } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseSwitchPreparation";
import { promiseMapSequential } from "@avandar/utils";
import type {
  SupabaseBackupManifest,
  SupabaseLocalEnvironmentIo,
  SupabaseLocalStatus,
  SupabaseRemoteConnection,
  SupabaseRemoteSwitchResult,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const DATABASE_URL_PATTERN = /^postgres(?:ql)?:\/\/\S+$/;

function _requireValidConnection(
  connection: Readonly<SupabaseRemoteConnection>,
): void {
  if (!PROJECT_ID_PATTERN.test(connection.projectId)) {
    throw new Error(
      "The remote project id must use only lower-case letters, numbers, hyphens, and underscores.",
    );
  }
  if (!/^https?:\/\/\S+$/.test(connection.apiUrl)) {
    throw new Error(
      `The remote API URL must start with https://, for example https://${connection.projectId}.supabase.co.`,
    );
  }
  if (!DATABASE_URL_PATTERN.test(connection.databaseUrl)) {
    throw new Error(
      "The remote database URL must be a postgresql:// connection string.",
    );
  }
  if (connection.publishableKey === "" || connection.secretKey === "") {
    throw new Error("The remote publishable and secret keys are required.");
  }
}

/** The connection in the shape env rewriting reads from `supabase status`. */
function _makeStatusFromConnection(
  connection: Readonly<SupabaseRemoteConnection>,
): SupabaseLocalStatus {
  return {
    apiUrl: connection.apiUrl.replace(/\/+$/, ""),
    databaseUrl: connection.databaseUrl,
    anonKey: connection.publishableKey,
    serviceRoleKey: connection.secretKey,
    publishableKey: connection.publishableKey,
    secretKey: connection.secretKey,
  };
}

async function _rewriteEnvFiles(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    envFiles: readonly string[];
    connection: SupabaseRemoteConnection;
  }>,
): Promise<void> {
  const { io, connection } = options;
  const developmentEnvPath = path.join(io.projectRoot, ".env.development");
  await promiseMapSequential(options.envFiles, async (envPath) => {
    const rewrittenContents = SupabaseConfig.makeDevelopmentEnvFromStatus({
      envContents: await io.readTextFile(envPath),
      status: _makeStatusFromConnection(connection),
    });
    await io.writeTextFile({
      filePath: envPath,
      contents:
        envPath === developmentEnvPath
          ? SupabaseConfigOverrides.makeEnvContentsWithOverrides({
              envContents: rewrittenContents,
              overrides: SupabaseConfigOverrides.makeRemoteOverrides(
                connection.projectId,
              ),
            })
          : rewrittenContents,
    });
  });
}

async function _rollBackRemoteSwitch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    backupDirectory: string;
    manifest: SupabaseBackupManifest;
    switchError: unknown;
  }>,
): Promise<never> {
  const { io, backupDirectory, manifest, switchError } = options;
  try {
    await SupabaseBackupStore.restoreFiles({ io, manifest });
    await io.removePath(backupDirectory);
  } catch (rollbackError) {
    throw new AggregateError(
      [switchError, rollbackError],
      `Supabase remote switch failed and rolling back failed. Backup retained at ${backupDirectory}.`,
    );
  }
  throw switchError;
}

async function _switchRemote(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    connection: SupabaseRemoteConnection;
  }>,
): Promise<SupabaseRemoteSwitchResult> {
  const { io, connection } = options;
  _requireValidConnection(connection);
  const identity = await SupabaseSwitchPreparation.readSwitchIdentity(io);
  const envFiles = await io.findDevelopmentEnvFiles();
  if (!envFiles.includes(path.join(io.projectRoot, ".env.development"))) {
    throw new Error(
      `Supabase switch needs a .env.development in ${io.projectRoot}, because that is the file the app reads its Supabase connection from.`,
    );
  }
  await SupabaseSwitchPreparation.requireSwitchSourceFiles({
    io,
    sourcePaths: envFiles,
    worktreePath: identity.worktreePath,
  });
  await SupabaseBackupHierarchy.prepareBackupHierarchy({ io, ...identity });
  const manifest = await SupabaseBackupStore.createBackup({
    io,
    ...identity,
    target: {
      kind: "remote" as const,
      remoteProjectId: connection.projectId,
      remoteApiUrl: connection.apiUrl,
    },
    sourcePaths: envFiles,
  });
  try {
    await _rewriteEnvFiles({ io, envFiles, connection });
    await SupabaseBackupStore.writeManifest({
      io,
      backupDirectory: identity.backupDirectory,
      manifest: { ...manifest, state: "active" },
    });
  } catch (error) {
    return await _rollBackRemoteSwitch({
      io,
      backupDirectory: identity.backupDirectory,
      manifest,
      switchError: error,
    });
  }
  return { remoteProjectId: connection.projectId, apiUrl: connection.apiUrl };
}

/**
 * Points a worktree's development env files at a hosted Supabase project, so
 * `pnpm dev` talks to that project instead of a local stack.
 *
 * Used by `SupabaseLocalEnvironment.switchRemote`. It shares the local
 * switch's backup, so `SupabaseLocalEnvironment.restore` undoes it the same
 * way, and a branch holds at most one switch of either kind.
 */
export const SupabaseRemoteSwitch = {
  switchRemote: _switchRemote,
};
