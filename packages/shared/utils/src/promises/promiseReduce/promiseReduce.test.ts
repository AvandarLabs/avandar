import { promiseReduce } from "@utils/promises/promiseReduce/promiseReduce.ts";
import { describe, expect, it } from "vitest";

describe("promiseReduce", () => {
  it("accumulates a value across async callbacks", async () => {
    const result = await promiseReduce(
      [1, 2, 3, 4],
      async (acc, item) => {
        return acc + item;
      },
      0,
    );
    expect(result).toBe(10);
  });

  it("passes the running index to the callback", async () => {
    const indices: number[] = [];
    await promiseReduce(
      ["a", "b", "c"],
      async (acc, _item, idx) => {
        indices.push(idx);
        return acc;
      },
      null,
    );
    expect(indices).toEqual([0, 1, 2]);
  });

  it("returns the initial value when the input is empty", async () => {
    const result = await promiseReduce(
      [] as number[],
      async (acc, item) => {
        return acc + item;
      },
      42,
    );
    expect(result).toBe(42);
  });
});
