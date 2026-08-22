/** Dashboard blocks queue only when a dashboard id is known. */
import { describe, expect, it } from "vitest";
import { shouldQueueDashboardBlock } from "./shouldQueueDashboardBlock";

describe("shouldQueueDashboardBlock", () => {
  it("returns false without a dashboard id and true for a uuid", () => {
    expect(shouldQueueDashboardBlock(undefined)).toBe(false);
    expect(shouldQueueDashboardBlock("")).toBe(false);
    expect(
      shouldQueueDashboardBlock("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
    ).toBe(true);
  });
});
