import { createInMemoryDrivesStore } from "@etl/stores/InMemoryDrivesStore/createInMemoryDrivesStore";
import { describe, expect, it } from "vitest";

const DRIVE = {
  pipelineName: "socrata",
  driveKey: "https://data.cityofnewyork.us",
  organizationLabels: { 1: "City", 2: "Agency" },
};

describe("createInMemoryDrivesStore", () => {
  it("keeps one row and one id per pipeline and drive key", async () => {
    const store = createInMemoryDrivesStore();

    const firstId = await store.upsert(DRIVE);
    const secondId = await store.upsert({
      ...DRIVE,
      organizationLabels: { 1: "Town" },
    });

    expect(secondId).toBe(firstId);
    expect(store.getDrives()).toEqual([
      { id: firstId, ...DRIVE, organizationLabels: { 1: "Town" } },
    ]);
  });

  it("gives a different drive its own id", async () => {
    const store = createInMemoryDrivesStore();

    const nycId = await store.upsert(DRIVE);
    const stateId = await store.upsert({
      ...DRIVE,
      driveKey: "https://data.ny.gov",
    });

    expect(stateId).not.toBe(nycId);
    expect(store.getUpsertCount()).toBe(2);
  });
});
