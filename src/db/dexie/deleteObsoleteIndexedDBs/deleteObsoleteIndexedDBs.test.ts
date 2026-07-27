import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteObsoleteIndexedDBs } from "./deleteObsoleteIndexedDBs";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("deleteObsoleteIndexedDBs", () => {
  it("deletes databases owned by retired features", async () => {
    const deleteDatabase = vi.spyOn(Dexie, "delete").mockResolvedValue();

    await deleteObsoleteIndexedDBs();

    expect(deleteDatabase).toHaveBeenCalledTimes(2);
    expect(deleteDatabase).toHaveBeenCalledWith("AvandarPlanStepDB");
    expect(deleteDatabase).toHaveBeenCalledWith("AvandarPlanAnnotationDB");
  });
});
