import { describe, expect, it } from "vitest";
import { makeJenksBreaks } from "./makeJenksBreaks";

describe("makeJenksBreaks", () => {
  it("finds deterministic natural breaks", () => {
    const values = [1, 2, 2, 3, 50, 51, 52, 100, 101, 102];

    const first = makeJenksBreaks(values, 3);
    const second = makeJenksBreaks(values, 3);

    expect(first).toEqual(second);
    expect(first.breaks).toEqual([50, 100]);
    expect(first.didSample).toBe(false);
  });

  it("samples exactly 5,000 evenly ranked values", () => {
    const values = Array.from({ length: 5_101 }, (_, index) => {
      return index;
    });

    const result = makeJenksBreaks(values, 5);

    expect(result.didSample).toBe(true);
    expect(result.sampledValueCount).toBe(5_000);
    expect(result.breaks).toHaveLength(4);
    expect(makeJenksBreaks(values, 5)).toEqual(result);
  });

  it.each([[[4, 4, 4]], [[]]])(
    "returns no cuts for degenerate values",
    (values) => {
      expect(makeJenksBreaks(values, 5).breaks).toEqual([]);
    },
  );
});
