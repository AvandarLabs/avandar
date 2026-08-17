import { describe, expect, it, vi } from "vitest";
import { DashboardSnapshotTransition } from "./DashboardSnapshotTransition";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111" as Dashboard.Id;

describe("DashboardSnapshotTransition.makeSnapshotTransitionPlanFromVisibility", () => {
  it("uploads workspace snapshots before clearing public snapshots", () => {
    expect(
      DashboardSnapshotTransition.makeSnapshotTransitionPlanFromVisibility(
        "workspace",
      ),
    ).toEqual({
      uploadBucket: "published-private",
      clearBucket: "published",
    });
  });

  it("uploads public snapshots before clearing workspace snapshots", () => {
    expect(
      DashboardSnapshotTransition.makeSnapshotTransitionPlanFromVisibility(
        "public",
      ),
    ).toEqual({
      uploadBucket: "published",
      clearBucket: "published-private",
    });
  });
});

describe("DashboardSnapshotTransition.clearAllSnapshotBuckets", () => {
  it("clears public and workspace snapshot buckets", async () => {
    const deleteDatasetsForDashboard = vi.fn().mockResolvedValue(undefined);

    await DashboardSnapshotTransition.clearAllSnapshotBuckets({
      assertCanDelete: vi.fn().mockResolvedValue(undefined),
      dashboardId: DASHBOARD_ID,
      deleteDatasetsForDashboard,
    });

    expect(deleteDatasetsForDashboard).toHaveBeenCalledTimes(2);
    expect(
      deleteDatasetsForDashboard.mock.calls.map(([options]) => {
        return options.bucket;
      }),
    ).toEqual(["published", "published-private"]);
  });

  it("attempts both buckets and reports a cleanup failure", async () => {
    const cleanupError = new Error("cleanup failed");
    const deleteDatasetsForDashboard = vi
      .fn()
      .mockRejectedValueOnce(cleanupError);

    await expect(
      DashboardSnapshotTransition.clearAllSnapshotBuckets({
        assertCanDelete: vi.fn().mockResolvedValue(undefined),
        dashboardId: DASHBOARD_ID,
        deleteDatasetsForDashboard,
      }),
    ).rejects.toBe(cleanupError);

    expect(deleteDatasetsForDashboard).toHaveBeenCalledTimes(2);
  });

  it("serializes bucket cleanup heartbeats that advance the same CAS row", async () => {
    let markPublicStarted: (() => void) | undefined;
    let releasePublic: (() => void) | undefined;
    const publicStarted = new Promise<void>((resolve) => {
      markPublicStarted = resolve;
    });
    const publicPaused = new Promise<void>((resolve) => {
      releasePublic = resolve;
    });
    const assertCanDelete = vi.fn().mockResolvedValue(undefined);
    const deleteDatasetsForDashboard = vi.fn(
      async ({ assertCanDelete: assertCurrentClaim, bucket }) => {
        await assertCurrentClaim();
        if (bucket === "published") {
          markPublicStarted?.();
          await publicPaused;
        }
      },
    );

    const cleanupPromise = DashboardSnapshotTransition.clearAllSnapshotBuckets({
      assertCanDelete,
      dashboardId: DASHBOARD_ID,
      deleteDatasetsForDashboard,
    });
    await publicStarted;

    expect(deleteDatasetsForDashboard).toHaveBeenCalledTimes(1);
    expect(assertCanDelete).toHaveBeenCalledTimes(1);

    releasePublic?.();
    await cleanupPromise;
    expect(deleteDatasetsForDashboard).toHaveBeenCalledTimes(2);
    expect(assertCanDelete).toHaveBeenCalledTimes(2);
  });
});
