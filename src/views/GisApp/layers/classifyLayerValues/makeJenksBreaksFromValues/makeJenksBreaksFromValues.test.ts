import { describe, expect, it } from "vitest";

import { makeJenksBreaksFromValues } from "./makeJenksBreaksFromValues";

describe("makeJenksBreaksFromValues", () => {
  it("finds deterministic natural breaks", () => {
    const values = [1, 2, 2, 3, 50, 51, 52, 100, 101, 102];

    const first = makeJenksBreaksFromValues({ values, classCount: 3 });
    const second = makeJenksBreaksFromValues({ values, classCount: 3 });

    expect(first).toEqual(second);
    expect(first.breaks).toEqual([50, 100]);
    expect(first.didSample).toBe(false);
  });

  it("samples exactly 5,000 evenly ranked values", () => {
    const values = Array.from({ length: 5_101 }, (_, index) => {
      return index;
    });

    const result = makeJenksBreaksFromValues({ values, classCount: 5 });

    expect(result.didSample).toBe(true);
    expect(result.sampledValueCount).toBe(5_000);
    expect(result.breaks).toHaveLength(4);
    expect(makeJenksBreaksFromValues({ values, classCount: 5 })).toEqual(
      result,
    );
  });

  it.each([[[4, 4, 4]], [[]]])(
    "returns no cuts for degenerate values",
    (values) => {
      expect(
        makeJenksBreaksFromValues({ values, classCount: 5 }).breaks,
      ).toEqual([]);
    },
  );
});
