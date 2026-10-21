import { promiseMapSequential } from "@avandar/utils";
import { assertValidScopeKeys } from "@etl/EtlEngine/assertValidScopeKeys/assertValidScopeKeys";
import { ETL_DEFAULT_SCOPE } from "@etl/EtlEngine/etlScopes";
import type {
  EtlEngineConfig,
  EtlScope,
} from "@etl/EtlEngine/EtlEngine.types";

/**
 * One drive with its key and validated scopes, or a drive that could not get
 * that far, with what it threw. `driveKey` is `listDrives[<index>]` when the
 * key itself could not be read.
 */
export type ResolvedDrive<TDrive, TScope extends EtlScope> =
  | Readonly<{
      isResolved: true;
      drive: TDrive;
      driveKey: string;
      scopes: readonly TScope[];
    }>
  | Readonly<{ isResolved: false; driveKey: string; error: unknown }>;

type _ResolveArgs<TDrive, TConnection, TScope extends EtlScope> = Readonly<{
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  drive: TDrive;
  driveIndex: number;
}>;

function _readDriveKey<TDrive, TConnection, TScope extends EtlScope>(
  args: _ResolveArgs<TDrive, TConnection, TScope>,
): Readonly<{ driveKey: string }> | Readonly<{ error: unknown }> {
  try {
    return { driveKey: args.config.getDriveKey(args.drive) };
  } catch (error: unknown) {
    return { error };
  }
}

async function _listValidScopes<TDrive, TConnection, TScope extends EtlScope>(
  args: _ResolveArgs<TDrive, TConnection, TScope> &
    Readonly<{ driveKey: string }>,
): Promise<readonly TScope[]> {
  const { listScopes } = args.config;
  // A config without listScopes keeps TScope at its default, EtlScope, so
  // the default scope is a TScope.
  const scopes =
    listScopes === undefined
      ? [ETL_DEFAULT_SCOPE as TScope]
      : await listScopes(args.drive);
  assertValidScopeKeys({
    driveKey: args.driveKey,
    scopeKeys: scopes.map((scope) => {
      return scope.key;
    }),
  });
  return scopes;
}

async function _resolveDrive<TDrive, TConnection, TScope extends EtlScope>(
  args: _ResolveArgs<TDrive, TConnection, TScope>,
): Promise<ResolvedDrive<TDrive, TScope>> {
  const keyRead = _readDriveKey(args);
  if (!("driveKey" in keyRead)) {
    return {
      isResolved: false,
      driveKey: `listDrives[${args.driveIndex}]`,
      error: keyRead.error,
    };
  }
  const { driveKey } = keyRead;
  try {
    const scopes = await _listValidScopes({ ...args, driveKey });
    return { isResolved: true, drive: args.drive, driveKey, scopes };
  } catch (error: unknown) {
    return { isResolved: false, driveKey, error };
  }
}

/**
 * Reads every drive's key and scopes, in `listDrives` order. A drive whose
 * key or scopes cannot be read, or whose scope keys are invalid, comes back
 * unresolved with what it threw, so a run can report it and go on.
 *
 * @param args.config - The pipeline.
 * @param args.drives - What `listDrives` returned.
 * @returns One entry per drive, in order.
 */
export async function resolveDriveScopes<
  TDrive,
  TConnection,
  TScope extends EtlScope,
>(args: {
  config: EtlEngineConfig<TDrive, TConnection, TScope>;
  drives: readonly TDrive[];
}): Promise<ReadonlyArray<ResolvedDrive<TDrive, TScope>>> {
  const indexedDrives = args.drives.map((drive, driveIndex) => {
    return { drive, driveIndex };
  });
  return promiseMapSequential(indexedDrives, ({ drive, driveIndex }) => {
    return _resolveDrive({ config: args.config, drive, driveIndex });
  });
}
