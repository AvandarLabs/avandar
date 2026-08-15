import { describe, expect, it } from "vitest";
import { appForResource } from "./appForResource";

describe("appForResource", () => {
  it("maps maps to the GIS app", () => {
    expect(appForResource("map")).toBe("gis");
  });
});
