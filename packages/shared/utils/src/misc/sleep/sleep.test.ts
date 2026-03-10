import { describe, expect, it } from "vitest";
import { sleep } from "./sleep.ts";

describe("wait", () => {
  it("resolves after the specified number of milliseconds", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it("resolves with undefined", async () => {
    const result = await sleep(0);
    expect(result).toBeUndefined();
  });
});
