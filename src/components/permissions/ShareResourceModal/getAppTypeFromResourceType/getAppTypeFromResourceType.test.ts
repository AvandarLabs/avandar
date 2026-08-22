import { describe, expect, it } from "vitest";

import { getAppTypeFromResourceType } from "./getAppTypeFromResourceType";

describe("getAppTypeFromResourceType", () => {
  it("maps maps to the GIS app", () => {
    expect(getAppTypeFromResourceType("map")).toBe("gis");
  });
});
