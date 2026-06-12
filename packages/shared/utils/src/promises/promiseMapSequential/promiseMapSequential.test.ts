import { promiseMapSequential } from "@utils/promises/promiseMapSequential/promiseMapSequential.ts";
import { describe, expect, it } from "vitest";

describe("promiseMapSequential", () => {
  it("returns results in input order", async () => {
    const result = await promiseMapSequential([1, 2, 3], async (n) => {
      return n * 2;
    });
    expect(result).toEqual([2, 4, 6]);
  });

  it("invokes callbacks sequentially (not in parallel)", async () => {
    const callOrder: number[] = [];
    await promiseMapSequential([1, 2, 3], async (n) => {
      callOrder.push(n);
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(callOrder).toEqual([1, 2, 3]);
  });

  it("returns an empty array for an empty input", async () => {
    expect(
      await promiseMapSequential([], async (n) => {
        return n;
      }),
    ).toEqual([]);
  });
});
