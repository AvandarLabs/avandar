import type { SnapshotBucketName } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_DUCKDB_LEASE_MARKER: unique symbol = Symbol(
  "DATASET_DUCKDB_LEASE_MARKER",
);

/** Identifies a published snapshot that owns a bare DuckDB dataset table. */
export type PublicSnapshotDuckDbOwner = Readonly<{
  bucket: SnapshotBucketName;
  dashboardId: Dashboard.Id;
  snapshotRevision: string;
}>;

/** Proves that an operation holds the listed dataset coordination leases. */
export type DatasetDuckDbLease = Readonly<{
  datasetIds: ReadonlySet<string>;
  [DATASET_DUCKDB_LEASE_MARKER]: true;
}>;

const loadedSnapshotOwnerByDatasetId = new Map<
  Dataset.Id,
  PublicSnapshotDuckDbOwner
>();
const invalidDatasetTableIds = new Set<Dataset.Id>();
const operationCompletionByDatasetId = new Map<string, Promise<void>>();

function _isSameOwner(
  options: Readonly<{
    leftOwner: PublicSnapshotDuckDbOwner | undefined;
    rightOwner: PublicSnapshotDuckDbOwner;
  }>,
): boolean {
  const { leftOwner, rightOwner } = options;
  return (
    leftOwner?.bucket === rightOwner.bucket &&
    leftOwner.dashboardId === rightOwner.dashboardId &&
    leftOwner.snapshotRevision === rightOwner.snapshotRevision
  );
}

function _hasLeaseForDatasetIds(
  options: Readonly<{
    lease: DatasetDuckDbLease;
    datasetIds: readonly string[];
  }>,
): boolean {
  const { lease, datasetIds } = options;
  return datasetIds.every((datasetId) => {
    return lease.datasetIds.has(datasetId);
  });
}

function _createLease(datasetIds: readonly string[]): DatasetDuckDbLease {
  return {
    datasetIds: new Set(datasetIds),
    [DATASET_DUCKDB_LEASE_MARKER]: true,
  };
}

/** Returns whether a dataset's bare table belongs to the given snapshot. */
function _isPublicSnapshotDatasetOwner(
  options: Readonly<{
    datasetId: Dataset.Id;
    owner: PublicSnapshotDuckDbOwner;
  }>,
): boolean {
  return (
    !invalidDatasetTableIds.has(options.datasetId) &&
    _isSameOwner({
      leftOwner: loadedSnapshotOwnerByDatasetId.get(options.datasetId),
      rightOwner: options.owner,
    })
  );
}

/** Returns whether any public snapshot currently owns the dataset table. */
function _hasPublicSnapshotDatasetOwner(datasetId: Dataset.Id): boolean {
  return (
    loadedSnapshotOwnerByDatasetId.has(datasetId) ||
    invalidDatasetTableIds.has(datasetId)
  );
}

/** Records which published snapshot owns a dataset's bare DuckDB table. */
function _setPublicSnapshotDatasetOwner(
  options: Readonly<{
    datasetId: Dataset.Id;
    owner: PublicSnapshotDuckDbOwner;
  }>,
): void {
  invalidDatasetTableIds.delete(options.datasetId);
  loadedSnapshotOwnerByDatasetId.set(options.datasetId, options.owner);
}

/** Marks a possibly mutated bare table as unsafe for every data source. */
function _markDatasetDuckDbTableInvalid(tableName: string): void {
  loadedSnapshotOwnerByDatasetId.delete(tableName as Dataset.Id);
  invalidDatasetTableIds.add(tableName as Dataset.Id);
}

/** Clears ownership before a bare DuckDB table is dropped or replaced. */
function _clearPublicSnapshotDatasetOwner(tableName: string): void {
  loadedSnapshotOwnerByDatasetId.delete(tableName as Dataset.Id);
  invalidDatasetTableIds.delete(tableName as Dataset.Id);
}

/** Marks a completely reloaded table as safe workspace data. */
function _markDatasetDuckDbTableValidForWorkspace(tableName: string): void {
  _clearPublicSnapshotDatasetOwner(tableName);
}

/** Rejects workspace reads of published or incompletely mutated tables. */
function _assertWorkspaceDatasetTables(datasetIds: readonly string[]): void {
  const invalidDatasetId = datasetIds.find((datasetId) => {
    return invalidDatasetTableIds.has(datasetId as Dataset.Id);
  });
  if (invalidDatasetId !== undefined) {
    throw new Error(
      `Workspace DuckDB read cannot use invalid table ${invalidDatasetId}`,
    );
  }
  const publicDatasetId = datasetIds.find((datasetId) => {
    return loadedSnapshotOwnerByDatasetId.has(datasetId as Dataset.Id);
  });
  if (publicDatasetId !== undefined) {
    throw new Error(
      `Workspace DuckDB read cannot use public table ${publicDatasetId}`,
    );
  }
}

/** Rejects a query when a referenced table belongs to another snapshot. */
function _assertPublicSnapshotDatasetOwners(
  options: Readonly<{
    datasetIds: readonly string[];
    owner: PublicSnapshotDuckDbOwner;
  }>,
): void {
  const hasMismatchedOwner = options.datasetIds.some((datasetId) => {
    return !_isPublicSnapshotDatasetOwner({
      datasetId: datasetId as Dataset.Id,
      owner: options.owner,
    });
  });
  if (hasMismatchedOwner) {
    throw new Error("Public snapshot tables changed before query execution");
  }
}

/**
 * Puts this operation at the back of every listed dataset's queue and returns
 * the prior work to wait on plus the teardown that releases the queue slots.
 */
function _enqueueDatasetOperation(datasetIds: readonly string[]): {
  priorOperations: Array<Promise<void>>;
  releaseQueueSlots: () => void;
} {
  const priorOperations = datasetIds.map((datasetId) => {
    return operationCompletionByDatasetId.get(datasetId) ?? Promise.resolve();
  });
  let completeOperation = () => {};
  const operationCompletion = new Promise<void>((resolve) => {
    completeOperation = resolve;
  });
  datasetIds.forEach((datasetId) => {
    operationCompletionByDatasetId.set(datasetId, operationCompletion);
  });
  return {
    priorOperations,
    releaseQueueSlots: () => {
      completeOperation();
      datasetIds.forEach((datasetId) => {
        if (
          operationCompletionByDatasetId.get(datasetId) === operationCompletion
        ) {
          operationCompletionByDatasetId.delete(datasetId);
        }
      });
    },
  };
}

/**
 * Namespaces the Web Lock names so they cannot collide with a lock taken
 * anywhere else in the app, or by another product on the same origin.
 */
function _toDatasetLockName(datasetId: string): string {
  return `avandar:dataset-duckdb:${datasetId}`;
}

/**
 * Runs `operation` while holding one exclusive Web Lock per name, which makes
 * the surrounding lease hold across tabs rather than only within this one.
 * The in-memory queue above it is per-document, so without this two tabs can
 * interleave writes to the same dataset's persisted bytes.
 *
 * `lockNames` MUST already be sorted. Acquiring in one global order is what
 * stops two tabs taking the same pair of locks in opposite orders and
 * deadlocking. `navigator.locks` takes a single name per request, so several
 * are acquired by folding the requests into a nest.
 *
 * Falls back to running the operation directly where the Web Locks API is
 * absent, which is the case in a non-secure context and under jsdom. That
 * degrades to the existing intra-tab serialization rather than failing.
 */
async function _withDatasetCrossTabLocks<Result>(
  lockNames: readonly string[],
  operation: () => Promise<Result>,
): Promise<Result> {
  const locks = globalThis.navigator?.locks;
  if (!locks) {
    return await operation();
  }
  const runWithinLocks = lockNames.reduceRight<() => Promise<Result>>(
    (runInner, lockName) => {
      return async () => {
        return await locks.request(lockName, async () => {
          return await runInner();
        });
      };
    },
    operation,
  );
  return await runWithinLocks();
}

/**
 * Runs an operation after prior work on the same dataset IDs has settled.
 * Unrelated dataset IDs use independent queues.
 */
async function _runCoordinatedDatasetDuckDbOperation<Result>(
  options: Readonly<{
    datasetIds: readonly string[];
    lease?: DatasetDuckDbLease;
    operation: (lease: DatasetDuckDbLease) => Promise<Result>;
  }>,
): Promise<Result> {
  // The sort is load-bearing rather than tidy: it is the global lock ordering
  // that keeps two tabs from acquiring the same pair of dataset locks in
  // opposite orders and deadlocking. Do not drop it.
  const datasetIds = Array.from(new Set(options.datasetIds)).sort();
  if (options.lease) {
    if (
      !_hasLeaseForDatasetIds({
        lease: options.lease,
        datasetIds,
      })
    ) {
      throw new Error(
        "DuckDB operation received an insufficient dataset lease",
      );
    }
    return await options.operation(options.lease);
  }

  const { priorOperations, releaseQueueSlots } =
    _enqueueDatasetOperation(datasetIds);
  await Promise.all(priorOperations);
  try {
    // Only a fresh lease takes the cross-tab locks. A caller that already
    // holds a lease returned above without reaching here, which matters
    // because Web Locks are not reentrant: re-requesting a name this stack
    // already holds would deadlock against itself.
    return await _withDatasetCrossTabLocks(
      datasetIds.map(_toDatasetLockName),
      async () => {
        return await options.operation(_createLease(datasetIds));
      },
    );
  } finally {
    releaseQueueSlots();
  }
}

/**
 * Coordinates ownership and serialized access to bare DuckDB dataset tables.
 */
export const DatasetDuckDbCoordinator = {
  /** Rejects a query when a referenced table belongs to another snapshot. */
  assertPublicSnapshotDatasetOwners: _assertPublicSnapshotDatasetOwners,
  /** Rejects workspace reads of published or invalid dataset tables. */
  assertWorkspaceDatasetTables: _assertWorkspaceDatasetTables,
  /** Clears public ownership before a table is dropped or replaced. */
  clearPublicSnapshotDatasetOwner: _clearPublicSnapshotDatasetOwner,
  /** Returns whether any public snapshot owns the dataset table. */
  hasPublicSnapshotDatasetOwner: _hasPublicSnapshotDatasetOwner,
  /** Returns whether a dataset table belongs to the given snapshot. */
  isPublicSnapshotDatasetOwner: _isPublicSnapshotDatasetOwner,
  /** Marks a possibly mutated table as unsafe for every data source. */
  markDatasetDuckDbTableInvalid: _markDatasetDuckDbTableInvalid,
  /** Marks a completely reloaded table as safe workspace data. */
  markDatasetDuckDbTableValidForWorkspace:
    _markDatasetDuckDbTableValidForWorkspace,
  /** Runs an operation under the listed dataset coordination leases. */
  runCoordinatedDatasetDuckDbOperation: _runCoordinatedDatasetDuckDbOperation,
  /** Records which published snapshot owns a dataset table. */
  setPublicSnapshotDatasetOwner: _setPublicSnapshotDatasetOwner,
};
