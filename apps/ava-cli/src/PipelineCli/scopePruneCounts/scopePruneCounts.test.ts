import {
  describeScopePruneCounts,
  isScopePruneEmpty,
  scopePruneCountsToDeletionCounts,
} from "@ava-cli/PipelineCli/scopePruneCounts/scopePruneCounts";
import { describe, expect, it } from "vitest";

const COUNTS = {
  listings_deleted: 3,
  listings_kept_in_use: 1,
  listings_detached: 2,
  checkpoints_deleted: 1,
};

describe("describeScopePruneCounts", () => {
  it("says what pruning does to listings and checkpoints", () => {
    expect(describeScopePruneCounts(COUNTS)).toBe(
      "delete 3 listing(s), keep 1 a workspace uses, detach 2 another scope still produces, delete 1 checkpoint(s)",
    );
  });
});

describe("isScopePruneEmpty", () => {
  it("is true only when every count is zero", () => {
    expect([
      isScopePruneEmpty(COUNTS),
      isScopePruneEmpty({
        listings_deleted: 0,
        listings_kept_in_use: 0,
        listings_detached: 0,
        checkpoints_deleted: 0,
      }),
    ]).toEqual([false, true]);
  });
});

describe("scopePruneCountsToDeletionCounts", () => {
  it("names a prune's counts as an execution records them", () => {
    expect(
      scopePruneCountsToDeletionCounts({
        listings_deleted: 1,
        listings_kept_in_use: 2,
        listings_detached: 3,
        checkpoints_deleted: 4,
      }),
    ).toEqual({
      listingsDeleted: 1,
      listingsKeptInUse: 2,
      listingsDetached: 3,
      checkpointsDeleted: 4,
    });
  });
});
