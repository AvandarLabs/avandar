/** Behavioral tests for internal discovery continuation metadata. */
import { describe, expect, it } from "vitest";
import { DiscoveryContinuationMessage } from "./DiscoveryContinuationMessage";

describe("DiscoveryContinuationMessage", () => {
  it("recognizes only explicitly tagged continuation metadata", () => {
    expect(
      DiscoveryContinuationMessage.isInternal(
        DiscoveryContinuationMessage.metadata,
      ),
    ).toBe(true);
    expect(DiscoveryContinuationMessage.isInternal(undefined)).toBe(false);
    expect(
      DiscoveryContinuationMessage.isInternal({ custom: { other: true } }),
    ).toBe(false);
  });
});
