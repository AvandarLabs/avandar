import { describe, expect, it } from "vitest";
import { getAxisRolesFromVizType } from "$/models/vizs/getAxisRolesFromVizType/getAxisRolesFromVizType.ts";

describe("getAxisRolesFromVizType", () => {
  it("gives bar, line, and area a category X and a value Y", () => {
    expect(getAxisRolesFromVizType("bar")).toEqual({
      x: "category",
      y: "value",
    });
    expect(getAxisRolesFromVizType("line")).toEqual({
      x: "category",
      y: "value",
    });
    expect(getAxisRolesFromVizType("area")).toEqual({
      x: "category",
      y: "value",
    });
  });

  it("gives scatter and bubble two value axes", () => {
    expect(getAxisRolesFromVizType("scatter")).toEqual({
      x: "value",
      y: "value",
    });
    expect(getAxisRolesFromVizType("bubble")).toEqual({
      x: "value",
      y: "value",
    });
  });

  it("gives vizs without cartesian axes no value axis", () => {
    expect(getAxisRolesFromVizType("pie")).toEqual({
      x: "category",
      y: "category",
    });
    expect(getAxisRolesFromVizType("funnel")).toEqual({
      x: "category",
      y: "category",
    });
    expect(getAxisRolesFromVizType("radar")).toEqual({
      x: "category",
      y: "category",
    });
    expect(getAxisRolesFromVizType("table")).toEqual({
      x: "category",
      y: "category",
    });
  });
});
