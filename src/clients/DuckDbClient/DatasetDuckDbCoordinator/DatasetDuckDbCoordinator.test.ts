/** Tests per-dataset DuckDB operation leases and snapshot ownership. */

import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

import { afterEach, describe, expect, it } from "vitest";

import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";

const DATASET_A_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const DATASET_B_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;

/**
 * A stand-in for the Web Locks API that records the order of acquisition and
 * release. It holds one queue per name, so a second request for a name still
 * held waits, which is what makes it usable for serialization assertions
 * rather than only for call counting.
 */
function _installFakeWebLocks(): {
  events: string[];
  restore: () => void;
} {
  const events: string[] = [];
  const tailByName = new Map<string, Promise<void>>();
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "locks");

  const fakeLocks = {
    request: async <Result>(
      name: string,
      callback: () => Promise<Result>,
    ): Promise<Result> => {
      const priorHolder = tailByName.get(name) ?? Promise.resolve();
      let releaseThisHold = () => {};
      const thisHold = new Promise<void>((resolve) => {
        releaseThisHold = resolve;
      });
      tailByName.set(
        name,
        priorHolder.then(() => {
          return thisHold;
        }),
      );
      await priorHolder;
      events.push(`acquire:${name}`);
      try {
        return await callback();
      } finally {
        events.push(`release:${name}`);
        releaseThisHold();
      }
    },
  };

  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: fakeLocks,
    writable: true,
  });

  return {
    events,
    restore: () => {
      if (descriptor) {
        Object.defineProperty(navigator, "locks", descriptor);
      } else {
        Reflect.deleteProperty(navigator, "locks");
      }
    },
  };
}

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function _createDeferred(): Deferred {
  let resolvePromise = () => {};
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

async function _flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("DatasetDuckDbCoordinator/DatasetDuckDbCoordinator", () => {
  it("runs operations for the same dataset in request order", async () => {
    const firstMayFinish = _createDeferred();
    const events: string[] = [];

    const firstOperation =
      DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
        datasetIds: [DATASET_A_ID],
        operation: async () => {
          events.push("first-started");
          await firstMayFinish.promise;
          events.push("first-finished");
        },
      });
    await _flushMicrotasks();
    const secondOperation =
      DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
        datasetIds: [DATASET_A_ID],
        operation: async () => {
          events.push("second-started");
        },
      });
    await _flushMicrotasks();

    expect(events).toEqual(["first-started"]);
    firstMayFinish.resolve();
    await Promise.all([firstOperation, secondOperation]);
    expect(events).toEqual([
      "first-started",
      "first-finished",
      "second-started",
    ]);
  });

  it("does not serialize unrelated datasets", async () => {
    const firstMayFinish = _createDeferred();
    let hasSecondStarted = false;

    const firstOperation =
      DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
        datasetIds: [DATASET_A_ID],
        operation: async () => {
          await firstMayFinish.promise;
        },
      });
    const secondOperation =
      DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
        datasetIds: [DATASET_B_ID],
        operation: async () => {
          hasSecondStarted = true;
        },
      });
    await _flushMicrotasks();

    expect(hasSecondStarted).toBe(true);
    firstMayFinish.resolve();
    await Promise.all([firstOperation, secondOperation]);
  });

  it("tracks and clears public ownership for a dataset", () => {
    const owner = {
      bucket: "published" as const,
      dashboardId: DASHBOARD_ID,
      snapshotRevision: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    };

    DatasetDuckDbCoordinator.setPublicSnapshotDatasetOwner({
      datasetId: DATASET_A_ID,
      owner,
    });
    expect(
      DatasetDuckDbCoordinator.isPublicSnapshotDatasetOwner({
        datasetId: DATASET_A_ID,
        owner,
      }),
    ).toBe(true);

    DatasetDuckDbCoordinator.clearPublicSnapshotDatasetOwner(DATASET_A_ID);
    expect(
      DatasetDuckDbCoordinator.isPublicSnapshotDatasetOwner({
        datasetId: DATASET_A_ID,
        owner,
      }),
    ).toBe(false);
  });
});

/**
 * The coordinator keeps its queues in module state, so a test that leaves an
 * operation pending would hold that dataset's queue for every later test.
 * Minting fresh IDs per test keeps one failure from cascading.
 */
let nextDatasetSuffix = 0;
function _createDatasetId(): Dataset.Id {
  nextDatasetSuffix += 1;
  const suffix = String(nextDatasetSuffix).padStart(12, "0");
  return `44444444-4444-4444-8444-${suffix}` as Dataset.Id;
}

describe("DatasetDuckDbCoordinator/cross-tab locking", () => {
  let restoreWebLocks = () => {};
  const pendingDeferreds: Deferred[] = [];

  function _createTrackedDeferred(): Deferred {
    const deferred = _createDeferred();
    pendingDeferreds.push(deferred);
    return deferred;
  }

  afterEach(async () => {
    // Let any operation a failed assertion abandoned run to completion, so it
    // releases both its queue slot and its lock.
    pendingDeferreds.splice(0).forEach((deferred) => {
      deferred.resolve();
    });
    await _flushMicrotasks();
    restoreWebLocks();
    restoreWebLocks = () => {};
  });

  it("holds a namespaced Web Lock per dataset around the operation", async () => {
    const fakeLocks = _installFakeWebLocks();
    restoreWebLocks = fakeLocks.restore;
    const datasetId = _createDatasetId();

    await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [datasetId],
      operation: async () => {
        fakeLocks.events.push("operation");
      },
    });

    expect(fakeLocks.events).toEqual([
      `acquire:avandar:dataset-duckdb:${datasetId}`,
      "operation",
      `release:avandar:dataset-duckdb:${datasetId}`,
    ]);
  });

  it("acquires several locks in sorted order, not the order requested", async () => {
    const fakeLocks = _installFakeWebLocks();
    restoreWebLocks = fakeLocks.restore;
    // Minted in ascending order, so `secondId` sorts after `firstId`. Passing
    // them reversed proves acquisition order comes from the sort rather than
    // from the argument, which is what avoids cross-tab deadlock.
    const firstId = _createDatasetId();
    const secondId = _createDatasetId();

    await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [secondId, firstId],
      operation: async () => {
        fakeLocks.events.push("operation");
      },
    });

    expect(fakeLocks.events).toEqual([
      `acquire:avandar:dataset-duckdb:${firstId}`,
      `acquire:avandar:dataset-duckdb:${secondId}`,
      "operation",
      `release:avandar:dataset-duckdb:${secondId}`,
      `release:avandar:dataset-duckdb:${firstId}`,
    ]);
  });

  it("releases every lock when the operation throws", async () => {
    const fakeLocks = _installFakeWebLocks();
    restoreWebLocks = fakeLocks.restore;
    const firstId = _createDatasetId();
    const secondId = _createDatasetId();

    await expect(
      DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
        datasetIds: [firstId, secondId],
        operation: async () => {
          throw new Error("operation failed");
        },
      }),
    ).rejects.toThrow("operation failed");

    expect(fakeLocks.events).toEqual([
      `acquire:avandar:dataset-duckdb:${firstId}`,
      `acquire:avandar:dataset-duckdb:${secondId}`,
      `release:avandar:dataset-duckdb:${secondId}`,
      `release:avandar:dataset-duckdb:${firstId}`,
    ]);
  });

  it("does not re-acquire a lock when the caller already holds a lease", async () => {
    const fakeLocks = _installFakeWebLocks();
    restoreWebLocks = fakeLocks.restore;
    const datasetId = _createDatasetId();

    await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [datasetId],
      operation: async (lease) => {
        fakeLocks.events.push("outer");
        // Web Locks are not reentrant, so a nested call under the same lease
        // would deadlock on a lock this stack already holds.
        await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
          datasetIds: [datasetId],
          lease,
          operation: async () => {
            fakeLocks.events.push("nested");
          },
        });
      },
    });

    expect(fakeLocks.events).toEqual([
      `acquire:avandar:dataset-duckdb:${datasetId}`,
      "outer",
      "nested",
      `release:avandar:dataset-duckdb:${datasetId}`,
    ]);
  });

  it("serializes two operations contending for the same lock name", async () => {
    const fakeLocks = _installFakeWebLocks();
    restoreWebLocks = fakeLocks.restore;
    const datasetId = _createDatasetId();
    const firstMayFinish = _createTrackedDeferred();

    const firstOperation =
      DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
        datasetIds: [datasetId],
        operation: async () => {
          fakeLocks.events.push("first");
          await firstMayFinish.promise;
        },
      });
    await _flushMicrotasks();
    const secondOperation =
      DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
        datasetIds: [datasetId],
        operation: async () => {
          fakeLocks.events.push("second");
        },
      });
    await _flushMicrotasks();

    expect(fakeLocks.events).toEqual([
      `acquire:avandar:dataset-duckdb:${datasetId}`,
      "first",
    ]);
    firstMayFinish.resolve();
    await Promise.all([firstOperation, secondOperation]);
    expect(fakeLocks.events).toEqual([
      `acquire:avandar:dataset-duckdb:${datasetId}`,
      "first",
      `release:avandar:dataset-duckdb:${datasetId}`,
      `acquire:avandar:dataset-duckdb:${datasetId}`,
      "second",
      `release:avandar:dataset-duckdb:${datasetId}`,
    ]);
  });

  it("still runs the operation where the Web Locks API is absent", async () => {
    // jsdom does not implement navigator.locks, and neither does a
    // non-secure context, so this is the real fallback path rather than a
    // hypothetical one.
    expect(
      (navigator as { locks?: unknown }).locks,
      "expected the fallback precondition: no Web Locks API",
    ).toBeUndefined();
    const events: string[] = [];

    await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
      datasetIds: [_createDatasetId()],
      operation: async () => {
        events.push("operation");
      },
    });

    expect(events).toEqual(["operation"]);
  });
});
