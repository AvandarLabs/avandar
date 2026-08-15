import { resourceTypeLabel } from "$/copy/resourceTypeLabel/resourceTypeLabel.ts";
import { describe, expect, it } from "vitest";

describe("resourceTypeLabel", () => {
  it("labels maps as maps", () => {
    expect(resourceTypeLabel("map")).toBe("map");
  });
});
