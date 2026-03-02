import { describe, expect, it } from "vitest";
import { wait } from "./wait.ts";

describe("wait", () => {
  it("resolves after the specified number of milliseconds", async () => {
    const start = Date.now();
    await wait(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it("resolves with undefined", async () => {
    const result = await wait(0);
    expect(result).toBeUndefined();
  });
});
