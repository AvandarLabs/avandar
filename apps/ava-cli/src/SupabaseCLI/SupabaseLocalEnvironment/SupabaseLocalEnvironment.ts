import { SupabaseBackupStore } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseBackupStore";
import { SupabaseConfig } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { SupabaseDockerCleanup } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseDockerCleanup";
import { SupabaseRestorePreparation } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseRestorePreparation";
import { SupabaseSwitchPreparation } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseSwitchPreparation";
import type {
  CommandResult,
  RestorePreparation,
  SupabaseBackupManifest,
  SupabaseLocalEnvironmentIO,
  SwitchPreparation,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type RollbackSwitchOptions = {
  io: SupabaseLocalEnvironmentIO;
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
    io: SupabaseLocalEnvironmentIO;
    envFiles: readonly string[];
    statusJson: string;
  }>,
): Promise<void> {
  const status = SupabaseConfig.makeLocalStatusFromJson(options.statusJson);
  const [envPath, ...remainingEnvFiles] = options.envFiles;
  if (!envPath) {
    return;
  }
  const envContents = await options.io.readTextFile(envPath);
  await options.io.writeTextFile({
    filePath: envPath,
    contents: SupabaseConfig.makeDevelopmentEnvFromStatus({
      envContents,
      status,
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
  return options.cleanupError ?
      [options.firstError, options.cleanupError, options.lastError]
    : [options.firstError, options.lastError];
}

function _manualCleanupSuffix(
  options: Readonly<{
    temporaryProjectId: string;
    cleanupError: Error | undefined;
  }>,
): string {
  const { temporaryProjectId, cleanupError } = options;
  return cleanupError ?
      ` manual cleanup is required for ${temporaryProjectId}.`
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
    io: SupabaseLocalEnvironmentIO;
    preparation: SwitchPreparation;
    temporaryProjectId: string;
  }>,
): Promise<{ basePort: number; projectId: string }> {
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
    result: await io.runSupabase(["start"]),
    stage: "Supabase start",
  });
  const statusResult = await io.runSupabase(["status", "-o", "json"]);
  _requireCommandSuccess({ result: statusResult, stage: "Supabase status" });
  await _rewriteDevelopmentEnvironments({
    io,
    envFiles: preparation.envFiles,
    statusJson: statusResult.stdout,
  });
  await SupabaseBackupStore.writeManifest({
    io,
    backupDirectory: preparation.backupDirectory,
    manifest: { ...preparation.manifest, state: "active" },
  });
  return {
    basePort: preparation.manifest.basePort,
    projectId: temporaryProjectId,
  };
}

async function _switch(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    temporaryProjectId: string;
    requestedBasePort?: number;
  }>,
): Promise<{ basePort: number; projectId: string }> {
  const preparation = await SupabaseSwitchPreparation.prepareSwitch(options);
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
}

async function _removeRestoredBackup(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    preparation: RestorePreparation;
    cleanupError: Error | undefined;
  }>,
): Promise<void> {
  try {
    await options.io.removePath(options.preparation.backupDirectory);
  } catch (backupError) {
    const errors =
      options.cleanupError ?
        [options.cleanupError, backupError]
      : [backupError];
    throw new AggregateError(
      errors,
      `Files were restored, but backup removal failed at ${options.preparation.backupDirectory}.${_manualCleanupSuffix({ temporaryProjectId: options.preparation.manifest.temporaryProjectId, cleanupError: options.cleanupError })}`,
    );
  }
}

async function _restoreCleanupError(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
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
  io: Readonly<SupabaseLocalEnvironmentIO>,
): Promise<void> {
  const preparation =
    await SupabaseRestorePreparation.readRestorePreparation(io);
  const cleanupError = await _restoreCleanupError({ io, preparation });
  const restoreError = await (async (): Promise<unknown> => {
    try {
      await SupabaseBackupStore.restoreFiles({
        io,
        manifest: preparation.manifest,
      });
      return undefined;
    } catch (error) {
      return error;
    }
  })();
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
  /** Starts an isolated local Supabase project for the current branch. */
  switch: _switch,

  /** Stops the current branch's temporary project and restores local files. */
  restore: _restore,
};
