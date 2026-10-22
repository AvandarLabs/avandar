import { describe, expect, it, vi } from "vitest";
import { createColumnTypeVerificationCoordinator } from "@/lib/openData/createColumnTypeVerificationCoordinator/createColumnTypeVerificationCoordinator";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

const LISTING_ID = "listing-a" as DataCatalogListing.Id;

/** A verification the test settles by hand. */
function _deferredVerify() {
  let settle: { resolve: () => void; reject: (error: Error) => void } = {
    resolve: () => {},
    reject: () => {},
  };
  const verify = vi.fn(() => {
    return new Promise<void>((resolve, reject) => {
      settle = { resolve, reject };
    });
  });
  return {
    verify,
    resolve: () => {
      settle.resolve();
    },
    reject: (error: Error) => {
      settle.reject(error);
    },
  };
}

describe("createColumnTypeVerificationCoordinator", () => {
  it("reports a listing as verifying while its verification runs, and idle after", async () => {
    const deferred = _deferredVerify();
    const onVerified = vi.fn();
    const coordinator = createColumnTypeVerificationCoordinator({
      verify: deferred.verify,
      onVerified,
    });

    const verification = coordinator.verify(LISTING_ID);
    const statusWhileRunning = coordinator.getStatus(LISTING_ID);
    deferred.resolve();
    await verification;

    expect([statusWhileRunning, coordinator.getStatus(LISTING_ID)]).toEqual([
      "verifying",
      "idle",
    ]);
    expect(onVerified).toHaveBeenCalledWith(LISTING_ID);
  });

  it("joins a verification already running instead of starting another", async () => {
    const deferred = _deferredVerify();
    const coordinator = createColumnTypeVerificationCoordinator({
      verify: deferred.verify,
      onVerified: vi.fn(),
    });

    const first = coordinator.verify(LISTING_ID);
    const second = coordinator.verify(LISTING_ID);
    deferred.resolve();
    await Promise.all([first, second]);

    expect(deferred.verify).toHaveBeenCalledTimes(1);
  });

  it("reports a failed verification, and starts over when asked again", async () => {
    const deferred = _deferredVerify();
    const coordinator = createColumnTypeVerificationCoordinator({
      verify: deferred.verify,
      onVerified: vi.fn(),
    });

    const failing = coordinator.verify(LISTING_ID);
    deferred.reject(new Error("sample unavailable"));
    await expect(failing).rejects.toThrow("sample unavailable");
    const statusAfterFailure = coordinator.getStatus(LISTING_ID);
    const retry = coordinator.verify(LISTING_ID);
    deferred.resolve();
    await retry;

    expect(statusAfterFailure).toBe("failed");
    expect(deferred.verify).toHaveBeenCalledTimes(2);
  });

  it("remembers which listings it has tried", async () => {
    const deferred = _deferredVerify();
    const coordinator = createColumnTypeVerificationCoordinator({
      verify: deferred.verify,
      onVerified: vi.fn(),
    });

    const before = coordinator.hasAttempted(LISTING_ID);
    const verification = coordinator.verify(LISTING_ID);
    deferred.resolve();
    await verification;

    expect([before, coordinator.hasAttempted(LISTING_ID)]).toEqual([
      false,
      true,
    ]);
  });

  it("tells subscribers when a status changes", async () => {
    const deferred = _deferredVerify();
    const coordinator = createColumnTypeVerificationCoordinator({
      verify: deferred.verify,
      onVerified: vi.fn(),
    });
    const listener = vi.fn();
    const unsubscribe = coordinator.subscribe(listener);

    const verification = coordinator.verify(LISTING_ID);
    deferred.resolve();
    await verification;
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
