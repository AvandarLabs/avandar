import { describe, expect, it } from "vitest";
import { SnapshotStorageUtils } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;
const SNAPSHOT_REVISION = "33333333-3333-4333-8333-333333333333";

describe("snapshot bucket routing", () => {
  it("sends public dashboards to the world-readable bucket", () => {
    expect(
      SnapshotStorageUtils.getSnapshotBucketNameFromVisibility("public"),
    ).toBe(SnapshotStorageUtils.PUBLIC_BUCKET_NAME);
  });

  it("sends workspace dashboards to the private bucket", () => {
    expect(
      SnapshotStorageUtils.getSnapshotBucketNameFromVisibility("workspace"),
    ).toBe(SnapshotStorageUtils.PRIVATE_BUCKET_NAME);
  });

  it("names the opposite bucket, which is the one a transition must clear", () => {
    expect(
      SnapshotStorageUtils.getOtherSnapshotBucketNameFromVisibility("public"),
    ).toBe(SnapshotStorageUtils.PRIVATE_BUCKET_NAME);
    expect(
      SnapshotStorageUtils.getOtherSnapshotBucketNameFromVisibility(
        "workspace",
      ),
    ).toBe(SnapshotStorageUtils.PUBLIC_BUCKET_NAME);
  });

  it("addresses objects by committed snapshot revision", () => {
    expect(
      SnapshotStorageUtils.getPublicDatasetParquetStoragePath({
        dashboardId: DASHBOARD_ID,
        datasetId: DATASET_ID,
        snapshotRevision: SNAPSHOT_REVISION,
      }),
    ).toBe(
      `dashboards/${DASHBOARD_ID}/revisions/${SNAPSHOT_REVISION}/datasets/${DATASET_ID}.parquet`,
    );
  });

  it("addresses the reserved legacy generation at the legacy object path", () => {
    expect(
      SnapshotStorageUtils.getPublicDatasetParquetStoragePath({
        dashboardId: DASHBOARD_ID,
        datasetId: DATASET_ID,
        snapshotRevision: SnapshotStorageUtils.LEGACY_SNAPSHOT_REVISION,
      }),
    ).toBe(`dashboards/${DASHBOARD_ID}/datasets/${DATASET_ID}.parquet`);
  });
});
