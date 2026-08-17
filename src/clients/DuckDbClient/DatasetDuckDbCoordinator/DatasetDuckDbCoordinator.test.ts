/** Tests per-dataset DuckDB operation leases and snapshot ownership. */

import { describe, expect, it } from "vitest";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_A_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const DATASET_B_ID = "33333333-3333-4333-8333-333333333333" as Dataset.Id;
const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;

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
