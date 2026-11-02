import { DevServerPort } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/DevServerPort/DevServerPort";
import { SupabaseBackupStore } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseBackupStore";
import { SupabaseConfig } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { SupabaseDockerCleanup } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseDockerCleanup";
import { SupabaseRestorePreparation } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseRestorePreparation";
import { SupabaseSwitchPreparation } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseSwitchPreparation";
import type {
  CommandResult,
  RestorePreparation,
  SupabaseBackupManifest,
  SupabaseLocalEnvironmentIo,
  SupabaseLocalStatus,
  SupabaseSeedOutcome,
  SupabaseSwitchResult,
  SwitchPreparation,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type RollbackSwitchOptions = {
  io: SupabaseLocalEnvironmentIo;
  backupDirectory: string;
  manifest: SupabaseBackupManifest;
  switchError: unknown;
};

function _requireCommandSuccess(
  options: Readonly<{ result: Readonly<CommandResult>; stage: string }>,
): void {
  const { result, stage } = options;
  if (!result.ok) {
    throw new Error(`${stage} failed: ${result.stderr || "unknown error"}`);
  }
}

async function _rewriteDevelopmentEnvironments(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    envFiles: readonly string[];
    status: SupabaseLocalStatus;
    devServerPort: number;
  }>,
): Promise<void> {
  const { status } = options;
  const [envPath, ...remainingEnvFiles] = options.envFiles;
  if (!envPath) {
    return;
  }
  const envContents = await options.io.readTextFile(envPath);
  await options.io.writeTextFile({
    filePath: envPath,
    contents: DevServerPort.toDevelopmentEnv({
      envContents: SupabaseConfig.makeDevelopmentEnvFromStatus({
        envContents,
        status,
      }),
      devServerPort: options.devServerPort,
    }),
  });
  await _rewriteDevelopmentEnvironments({
    ...options,
    envFiles: remainingEnvFiles,
  });
}

function _errorsIncludingCleanup(
  options: Readonly<{
    firstError: unknown;
    cleanupError: Error | undefined;
    lastError: unknown;
  }>,
): unknown[] {
  return options.cleanupError
    ? [options.firstError, options.cleanupError, options.lastError]
    : [options.firstError, options.lastError];
}

function _manualCleanupSuffix(
  options: Readonly<{
    temporaryProjectId: string;
    cleanupError: Error | undefined;
  }>,
): string {
  const { temporaryProjectId, cleanupError } = options;
  return cleanupError
    ? ` manual cleanup is required for ${temporaryProjectId}.`
    : "";
}

async function _rollbackSwitch(
  options: Readonly<RollbackSwitchOptions>,
): Promise<never> {
  const cleanupError = await SupabaseDockerCleanup.cleanupTemporaryProject({
    io: options.io,
    temporaryProjectId: options.manifest.temporaryProjectId,
  });
  try {
    await SupabaseBackupStore.restoreFiles({
      io: options.io,
      manifest: options.manifest,
    });
  } catch (restoreError) {
    throw new AggregateError(
      _errorsIncludingCleanup({
        firstError: options.switchError,
        cleanupError,
        lastError: restoreError,
      }),
      `Supabase switch failed and file restoration failed. Backup retained at ${options.backupDirectory}.${_manualCleanupSuffix({ temporaryProjectId: options.manifest.temporaryProjectId, cleanupError })}`,
    );
  }
  try {
    await options.io.removePath(options.backupDirectory);
  } catch (backupError) {
    throw new AggregateError(
      _errorsIncludingCleanup({
        firstError: options.switchError,
        cleanupError,
        lastError: backupError,
      }),
      `Supabase switch failed and files were restored, but backup removal failed at ${options.backupDirectory}.${_manualCleanupSuffix({ temporaryProjectId: options.manifest.temporaryProjectId, cleanupError })}`,
    );
  }
  if (cleanupError) {
    throw new AggregateError(
      [options.switchError, cleanupError],
      `Supabase switch failed; files were restored, but ${options.manifest.temporaryProjectId} requires manual cleanup.`,
    );
  }
  throw options.switchError;
}

async function _activateSwitch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    preparation: SwitchPreparation;
    temporaryProjectId: string;
  }>,
): Promise<{
  basePort: number;
  devServerPort: number;
  projectId: string;
  status: SupabaseLocalStatus;
}> {
  const { io, preparation, temporaryProjectId } = options;
  await io.writeTextFile({
    filePath: preparation.configPath,
    contents: SupabaseConfig.makeConfigContentsFromBasePort({
      configContents: preparation.configContents,
      projectId: temporaryProjectId,
      basePort: preparation.manifest.basePort,
    }),
  });
  _requireCommandSuccess({
    result: await io.runSupabase(["start"], { outputMode: "stream" }),
    stage: "Supabase start",
  });
  const statusResult = await io.runSupabase(["status", "-o", "json"]);
  _requireCommandSuccess({ result: statusResult, stage: "Supabase status" });
  const status = SupabaseConfig.makeLocalStatusFromJson(statusResult.stdout);
  await _rewriteDevelopmentEnvironments({
    io,
    envFiles: preparation.envFiles,
    status,
    devServerPort: preparation.devServerPort,
  });
  await SupabaseBackupStore.writeManifest({
    io,
    backupDirectory: preparation.backupDirectory,
    manifest: { ...preparation.manifest, state: "active" },
  });
  return {
    basePort: preparation.manifest.basePort,
    devServerPort: preparation.devServerPort,
    projectId: temporaryProjectId,
    status,
  };
}

/**
 * Seeds the stack a switch just activated.
 *
 * The connection comes from the `supabase status` the switch already read, not
 * from the environment file it wrote, so the seed cannot reach a stale stack
 * even if writing that file left it inconsistent. Migrations already ran inside
 * `supabase start`, so only the repository's own seed data is missing.
 *
 * A failure returns rather than throws. The switch has completed by this point
 * and the project is running; tearing it down over a seed the user can rerun
 * would lose far more than it protects.
 */
async function _seedSwitchedProject(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    status: SupabaseLocalStatus;
    skipSeed: boolean;
  }>,
): Promise<SupabaseSeedOutcome> {
  if (options.skipSeed) {
    return { state: "skipped" };
  }
  try {
    const result = await options.io.runSeed({
      supabaseUrl: options.status.apiUrl,
      serviceRoleKey: options.status.secretKey,
    });
    if (result.ok) {
      return { state: "seeded" };
    }
    return {
      state: "failed",
      message: result.stderr || result.stdout || "unknown error",
    };
  } catch (error) {
    return {
      state: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function _switch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    temporaryProjectId: string;
    requestedBasePort?: number;
    skipSeed?: boolean;
  }>,
): Promise<SupabaseSwitchResult> {
  const preparation = await SupabaseSwitchPreparation.prepareSwitch(options);
  const activation = await (async () => {
    try {
      return await _activateSwitch({
        io: options.io,
        preparation,
        temporaryProjectId: options.temporaryProjectId,
      });
    } catch (error) {
      return await _rollbackSwitch({
        io: options.io,
        backupDirectory: preparation.backupDirectory,
        manifest: preparation.manifest,
        switchError: error,
      });
    }
  })();
  const { status, ...switchResult } = activation;
  return {
    ...switchResult,
    seed: await _seedSwitchedProject({
      io: options.io,
      status,
      skipSeed: options.skipSeed ?? false,
    }),
  };
}

async function _removeRestoredBackup(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    preparation: RestorePreparation;
    cleanupError: Error | undefined;
  }>,
): Promise<void> {
  try {
    await options.io.removePath(options.preparation.backupDirectory);
  } catch (backupError) {
    const errors = options.cleanupError
      ? [options.cleanupError, backupError]
      : [backupError];
    throw new AggregateError(
      errors,
      `Files were restored, but backup removal failed at ${options.preparation.backupDirectory}.${_manualCleanupSuffix({ temporaryProjectId: options.preparation.manifest.temporaryProjectId, cleanupError: options.cleanupError })}`,
    );
  }
}

async function _restoreCleanupError(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    preparation: RestorePreparation;
  }>,
): Promise<Error | undefined> {
  const { io, preparation } = options;
  if (!preparation.hasProvenOwnership) {
    return new Error(
      `Temporary project ownership could not be safely proven; manual cleanup is required for ${preparation.manifest.temporaryProjectId}.`,
    );
  }
  return await SupabaseDockerCleanup.cleanupTemporaryProject({
    io,
    temporaryProjectId: preparation.manifest.temporaryProjectId,
  });
}

async function _restore(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<void> {
  const preparation =
    await SupabaseRestorePreparation.readRestorePreparation(io);
  const [cleanupError, restoreError] = await Promise.all([
    _restoreCleanupError({ io, preparation }),
    (async (): Promise<unknown> => {
      try {
        await SupabaseBackupStore.restoreFiles({
          io,
          manifest: preparation.manifest,
        });
        return undefined;
      } catch (error) {
        return error;
      }
    })(),
  ]);
  if (restoreError) {
    const errors = cleanupError ? [cleanupError, restoreError] : [restoreError];
    throw new AggregateError(
      errors,
      `Supabase file restoration failed. Backup retained at ${preparation.backupDirectory}.${_manualCleanupSuffix({ temporaryProjectId: preparation.manifest.temporaryProjectId, cleanupError })}`,
    );
  }
  await _removeRestoredBackup({ io, preparation, cleanupError });
  if (cleanupError) {
    throw new Error(
      `Files were restored, but ${preparation.manifest.temporaryProjectId} requires manual cleanup: ${cleanupError.message}`,
    );
  }
}

/** Manages branch-isolated local Supabase configuration and resources. */
export const SupabaseLocalEnvironment = {
  /**
   * Starts an isolated local Supabase project for the current branch and
   * seeds it, unless `skipSeed` is set.
   */
  switch: _switch,

  /** Stops the current branch's temporary project and restores local files. */
  restore: _restore,
};
