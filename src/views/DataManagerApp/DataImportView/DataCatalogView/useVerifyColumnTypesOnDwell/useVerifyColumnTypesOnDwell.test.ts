import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createColumnTypeVerificationCoordinator } from "@/lib/openData/createColumnTypeVerificationCoordinator/createColumnTypeVerificationCoordinator";
import { act, renderHook } from "@/test-utils";
import {
  COLUMN_TYPE_VERIFICATION_DWELL_MS,
  useColumnTypeVerificationStatus,
  useVerifyColumnTypesOnDwell,
} from "@/views/DataManagerApp/DataImportView/DataCatalogView/useVerifyColumnTypesOnDwell/useVerifyColumnTypesOnDwell";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";

function _listing(
  id: string,
  overrides: Partial<DataCatalogListing.T> = {},
): DataCatalogListing.T {
  return {
    id: id as DataCatalogListing.Id,
    accessKind: "api_resource",
    apiResourceFormat: "CSV",
    dateColumnTypeLastVerified: undefined,
    dateOfLastUpdate: "2026-10-20T00:00:00+00:00",
    ...overrides,
  } as DataCatalogListing.T;
}

function _render(listing: DataCatalogListing.T | undefined) {
  const verify = vi.fn(async () => {});
  const coordinator = createColumnTypeVerificationCoordinator({
    verify,
    onVerified: vi.fn(),
  });
  const hook = renderHook(
    ({ current }: { current: DataCatalogListing.T | undefined }) => {
      useVerifyColumnTypesOnDwell({ listing: current, coordinator });
    },
    { initialProps: { current: listing } },
  );
  return { ...hook, verify, coordinator };
}

describe("useVerifyColumnTypesOnDwell", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies an unverified listing once it has been open for the dwell time", async () => {
    const { verify } = _render(_listing("a"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLUMN_TYPE_VERIFICATION_DWELL_MS);
    });

    expect(verify).toHaveBeenCalledWith("a");
  });

  it("does nothing when the listing is closed before the dwell time", async () => {
    const { verify, rerender } = _render(_listing("a"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLUMN_TYPE_VERIFICATION_DWELL_MS - 1);
    });
    rerender({ current: _listing("b") });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(verify).not.toHaveBeenCalled();
  });

  it("does nothing for a listing whose types are verified and current", async () => {
    const { verify } = _render(
      _listing("a", {
        dateColumnTypeLastVerified: "2026-10-21T00:00:00+00:00",
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLUMN_TYPE_VERIFICATION_DWELL_MS);
    });

    expect(verify).not.toHaveBeenCalled();
  });

  it("starts a listing only once while the page is open", async () => {
    const { verify, rerender } = _render(_listing("a"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLUMN_TYPE_VERIFICATION_DWELL_MS);
    });

    rerender({ current: _listing("b") });
    rerender({ current: _listing("a") });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLUMN_TYPE_VERIFICATION_DWELL_MS);
    });

    expect(verify).toHaveBeenCalledTimes(1);
  });
});

describe("useColumnTypeVerificationStatus", () => {
  it("follows a listing's verification as it runs", async () => {
    let finish = () => {};
    const coordinator = createColumnTypeVerificationCoordinator({
      verify: () => {
        return new Promise<void>((resolve) => {
          finish = resolve;
        });
      },
      onVerified: vi.fn(),
    });
    const { result } = renderHook(() => {
      return useColumnTypeVerificationStatus({
        catalogListingId: "a" as DataCatalogListing.Id,
        coordinator,
      });
    });

    let verification: Promise<void> = Promise.resolve();
    act(() => {
      verification = coordinator.verify("a" as DataCatalogListing.Id);
    });
    const statusWhileRunning = result.current;
    await act(async () => {
      finish();
      await verification;
    });

    expect([statusWhileRunning, result.current]).toEqual(["verifying", "idle"]);
  });
});
