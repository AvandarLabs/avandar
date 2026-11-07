import { describe, expect, it } from "vitest";
import { makeQueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";

const ROWS = [{ x: 1 }, { x: 2 }];

describe("makeQueryHandleRegistry", () => {
  it("returns the same handle for the same rows", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });

    expect(registry.getOrCreate(ROWS)).toBe(registry.getOrCreate(ROWS));
  });

  it("returns different handles for different rows", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });

    expect(registry.getOrCreate(ROWS)).not.toBe(
      registry.getOrCreate([{ x: 1 }, { x: 2 }]),
    );
  });

  it("returns the rows a handle was created for", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    const handle = registry.getOrCreate(ROWS);

    expect(registry.getRows(handle)).toBe(ROWS);
  });

  it("keeps every handle readable up to the live limit", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    const rowSets = [[{ x: 1 }], [{ x: 2 }], [{ x: 3 }]];

    const handles = rowSets.map((rows) => {
      return registry.getOrCreate(rows);
    });

    expect(
      handles.map((handle) => {
        return registry.getRows(handle);
      }),
    ).toEqual(rowSets);
  });

  it("stops serving the oldest handle once the live limit is exceeded", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    const oldestHandle = registry.getOrCreate(ROWS);

    for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
      registry.getOrCreate([{ x: rowIndex }]);
    }

    expect(registry.getRows(oldestHandle)).toBeUndefined();
  });

  it("keeps serving the newest handle once the live limit is exceeded", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    const newestRows = [{ x: 99 }];
    for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
      registry.getOrCreate([{ x: rowIndex }]);
    }

    const newestHandle = registry.getOrCreate(newestRows);

    expect(registry.getRows(newestHandle)).toBe(newestRows);
  });

  it("makes evicted rows readable again when they are requested again", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    registry.getOrCreate(ROWS);
    for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
      registry.getOrCreate([{ x: rowIndex }]);
    }

    const reissuedHandle = registry.getOrCreate(ROWS);

    expect(registry.getRows(reissuedHandle)).toBe(ROWS);
  });

  it("reuses the original handle when evicted rows are requested again", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    const originalHandle = registry.getOrCreate(ROWS);
    for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
      registry.getOrCreate([{ x: rowIndex }]);
    }

    expect(registry.getOrCreate(ROWS)).toBe(originalHandle);
  });

  it("evicts the oldest live handle when evicted rows are registered again", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    registry.getOrCreate(ROWS);
    const oldestLiveHandle = registry.getOrCreate([{ x: 1 }]);
    registry.getOrCreate([{ x: 2 }]);
    const newestLiveHandle = registry.getOrCreate([{ x: 3 }]);

    registry.getOrCreate(ROWS);

    expect(registry.getRows(oldestLiveHandle)).toBeUndefined();
    expect(registry.getRows(newestLiveHandle)).toBeDefined();
  });
});
