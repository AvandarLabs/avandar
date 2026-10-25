import { describe, expect, it, vi } from "vitest";
import { createColumnTypeVerificationCoordinator } from "@/lib/openData/createColumnTypeVerificationCoordinator/createColumnTypeVerificationCoordinator";
import { readCatalogColumnsForAdding } from "@/views/DataManagerApp/DataImportView/DataCatalogView/readCatalogColumnsForAdding/readCatalogColumnsForAdding";
import type { DataCatalogListing } from "$/models/data-catalog-listings/DataCatalogListing/DataCatalogListing";
import type { DataCatalogRelationColumn } from "$/models/data-catalog-listings/DataCatalogRelationColumn/DataCatalogRelationColumn";

const LISTING_ID = "listing-a" as DataCatalogListing.Id;
const COLUMNS = [
  { columnName: "year" },
] as unknown as DataCatalogRelationColumn.T[];

function _setUp(verify = vi.fn(async () => {})) {
  const coordinator = createColumnTypeVerificationCoordinator({
    verify,
    onVerified: vi.fn(),
  });
  const readColumns = vi.fn(async () => {
    return COLUMNS;
  });
  return { coordinator, readColumns, verify };
}

describe("readCatalogColumnsForAdding", () => {
  it("verifies a never-verified listing before reading its columns", async () => {
    const events: string[] = [];
    const { coordinator } = _setUp(
      vi.fn(async () => {
        events.push("verify");
      }),
    );

    const columns = await readCatalogColumnsForAdding({
      listing: { id: LISTING_ID, dateColumnTypeLastVerified: undefined },
      coordinator,
      readColumns: async () => {
        events.push("read");
        return COLUMNS;
      },
    });

    expect([columns, events]).toEqual([COLUMNS, ["verify", "read"]]);
  });

  it("reads a verified listing's columns without verifying again", async () => {
    const { coordinator, readColumns, verify } = _setUp();

    await readCatalogColumnsForAdding({
      listing: {
        id: LISTING_ID,
        dateColumnTypeLastVerified: "2026-10-21T00:00:00+00:00",
      },
      coordinator,
      readColumns,
    });

    expect([verify.mock.calls.length, readColumns.mock.calls.length]).toEqual([
      0, 1,
    ]);
  });

  it("waits for a verification already running, without starting another", async () => {
    let finish = () => {};
    const verify = vi.fn(() => {
      return new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    const { coordinator, readColumns } = _setUp(verify);
    const running = coordinator.verify(LISTING_ID);

    const reading = readCatalogColumnsForAdding({
      listing: {
        id: LISTING_ID,
        dateColumnTypeLastVerified: "2026-10-01T00:00:00+00:00",
      },
      coordinator,
      readColumns,
    });
    const readBeforeFinish = readColumns.mock.calls.length;
    finish();
    await Promise.all([running, reading]);

    expect([verify.mock.calls.length, readBeforeFinish]).toEqual([1, 0]);
  });

  it("fails without reading columns when verification fails", async () => {
    const { coordinator, readColumns } = _setUp(
      vi.fn(async () => {
        throw new Error("sample unavailable");
      }),
    );

    await expect(
      readCatalogColumnsForAdding({
        listing: { id: LISTING_ID, dateColumnTypeLastVerified: undefined },
        coordinator,
        readColumns,
      }),
    ).rejects.toThrow("sample unavailable");
    expect(readColumns).not.toHaveBeenCalled();
  });
});
