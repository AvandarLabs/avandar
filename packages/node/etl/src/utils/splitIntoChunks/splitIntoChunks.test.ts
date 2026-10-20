import { splitIntoChunks } from "@etl/utils/splitIntoChunks/splitIntoChunks";
import { describe, expect, it } from "vitest";

describe("splitIntoChunks", () => {
  it("splits items into consecutive chunks, the last one shorter", () => {
    expect(splitIntoChunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns no chunks for no items", () => {
    expect(splitIntoChunks([], 2)).toEqual([]);
  });
});
