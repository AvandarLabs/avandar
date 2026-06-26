import { promiseMap } from "@utils/promises/promiseMap/promiseMap.ts";
import { describe, expect, it } from "vitest";

describe("promiseMap", () => {
  it("maps every item through an async callback", async () => {
    const result = await promiseMap([1, 2, 3], async (n) => {
      return n * 2;
    });
    expect(result).toEqual([2, 4, 6]);
  });

  it("accepts sync callbacks", async () => {
    const result = await promiseMap([1, 2, 3], (n) => {
      return n + 1;
    });
    expect(result).toEqual([2, 3, 4]);
  });

  it("preserves input order in the result array", async () => {
    const result = await promiseMap([1, 2, 3], async (n) => {
      await new Promise((resolve) => {
        setTimeout(resolve, n === 1 ? 20 : 0);
      });
      return n;
    });
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns an empty array for an empty input", async () => {
    expect(
      await promiseMap([], async (n) => {
        return n;
      }),
    ).toEqual([]);
  });
});
