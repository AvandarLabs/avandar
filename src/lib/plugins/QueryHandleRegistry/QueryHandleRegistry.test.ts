import { afterEach, describe, expect, it } from "vitest";
import {
  makeQueryHandleRegistry,
  QueryHandleRegistry,
} from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
import type { QueryHandle } from "@avandar/plugin-sdk";

const ROWS = [{ x: 1 }, { x: 2 }];

function _registerFreshRowSets(options: {
  registry: ReturnType<typeof makeQueryHandleRegistry>;
  numRowSets: number;
}): QueryHandle[] {
  return Array.from({ length: options.numRowSets }, (_unused, rowIndex) => {
    return options.registry.getOrCreate([{ x: rowIndex }]);
  });
}

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

    _registerFreshRowSets({ registry, numRowSets: 3 });

    expect(registry.getRows(oldestHandle)).toBeUndefined();
  });

  it("keeps serving the newest handle once the live limit is exceeded", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    const newestRows = [{ x: 99 }];
    _registerFreshRowSets({ registry, numRowSets: 3 });

    const newestHandle = registry.getOrCreate(newestRows);

    expect(registry.getRows(newestHandle)).toBe(newestRows);
  });

  it("makes evicted rows readable again when they are requested again", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    registry.getOrCreate(ROWS);
    _registerFreshRowSets({ registry, numRowSets: 3 });

    const reissuedHandle = registry.getOrCreate(ROWS);

    expect(registry.getRows(reissuedHandle)).toBe(ROWS);
  });

  it("reuses the original handle when evicted rows are requested again", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    const originalHandle = registry.getOrCreate(ROWS);
    _registerFreshRowSets({ registry, numRowSets: 3 });

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

  it("stops serving every handle once cleared", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    const handles = _registerFreshRowSets({ registry, numRowSets: 3 });

    registry.clear();

    expect(
      handles.map((handle) => {
        return registry.getRows(handle);
      }),
    ).toEqual([undefined, undefined, undefined]);
  });

  it("serves rows registered again after a clear", () => {
    const registry = makeQueryHandleRegistry({ maxLiveHandles: 3 });
    registry.getOrCreate(ROWS);
    registry.clear();

    const handle = registry.getOrCreate(ROWS);

    expect(registry.getRows(handle)).toBe(ROWS);
  });
});

describe("QueryHandleRegistry.release", () => {
  afterEach(() => {
    QueryHandleRegistry.clear();
  });

  it("releases one handle and leaves another readable", () => {
    const explorer = QueryHandleRegistry.getOrCreate([{ x: 1 }]);
    const chat = QueryHandleRegistry.getOrCreate([{ x: 2 }]);

    QueryHandleRegistry.release(chat);

    expect(QueryHandleRegistry.getRows(explorer)).toEqual([{ x: 1 }]);
    expect(QueryHandleRegistry.getRows(chat)).toBeUndefined();
  });
});
