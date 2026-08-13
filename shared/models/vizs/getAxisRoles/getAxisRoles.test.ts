import { getAxisRoles } from "$/models/vizs/getAxisRoles/getAxisRoles.ts";
import { describe, expect, it } from "vitest";

describe("getAxisRoles", () => {
  it("gives bar, line, and area a category X and a value Y", () => {
    expect(getAxisRoles("bar")).toEqual({ x: "category", y: "value" });
    expect(getAxisRoles("line")).toEqual({ x: "category", y: "value" });
    expect(getAxisRoles("area")).toEqual({ x: "category", y: "value" });
  });

  it("gives scatter and bubble two value axes", () => {
    expect(getAxisRoles("scatter")).toEqual({ x: "value", y: "value" });
    expect(getAxisRoles("bubble")).toEqual({ x: "value", y: "value" });
  });

  it("gives vizs without cartesian axes no value axis", () => {
    expect(getAxisRoles("pie")).toEqual({ x: "category", y: "category" });
    expect(getAxisRoles("funnel")).toEqual({ x: "category", y: "category" });
    expect(getAxisRoles("radar")).toEqual({ x: "category", y: "category" });
    expect(getAxisRoles("table")).toEqual({ x: "category", y: "category" });
  });
});
