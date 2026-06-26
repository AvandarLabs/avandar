import { promiseFlatMap } from "@utils/promises/promiseFlatMap/promiseFlatMap.ts";
import { describe, expect, it } from "vitest";

describe("promiseFlatMap", () => {
  it("flattens one level of arrays returned by the callback", async () => {
    const result = await promiseFlatMap([1, 2, 3], async (n) => {
      return [n, n * 10];
    });
    expect(result).toEqual([1, 10, 2, 20, 3, 30]);
  });

  it("returns an empty array when every callback returns empty", async () => {
    const result = await promiseFlatMap([1, 2, 3], async () => {
      return [];
    });
    expect(result).toEqual([]);
  });

  it("accepts sync callbacks that return arrays", async () => {
    const result = await promiseFlatMap([1, 2], (n) => {
      return [n, n + 1];
    });
    expect(result).toEqual([1, 2, 2, 3]);
  });
});
