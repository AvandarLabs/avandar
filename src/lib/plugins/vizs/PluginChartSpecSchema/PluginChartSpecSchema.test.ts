import { describe, expect, it } from "vitest";
import { PluginChartSpecSchema } from "@/lib/plugins/vizs/PluginChartSpecSchema/PluginChartSpecSchema";

const EPICURVE_SPEC = {
  kind: "bar",
  xColumn: "bucket",
  xColumnType: "date",
  series: [
    { column: "vaccinated", label: "Vaccinated" },
    { column: "unvaccinated", label: "Unvaccinated" },
  ],
  layout: "stack",
  barGap: "none",
};

describe("PluginChartSpecSchema", () => {
  it("accepts a stacked bar spec with a date x column", () => {
    expect(PluginChartSpecSchema.safeParse(EPICURVE_SPEC).success).toBe(true);
  });

  it("rejects a chart kind other than bar, line, or area", () => {
    expect(
      PluginChartSpecSchema.safeParse({ ...EPICURVE_SPEC, kind: "pie" })
        .success,
    ).toBe(false);
  });

  it("rejects a spec with no series", () => {
    expect(
      PluginChartSpecSchema.safeParse({ ...EPICURVE_SPEC, series: [] }).success,
    ).toBe(false);
  });

  it("rejects a series with an empty column name", () => {
    expect(
      PluginChartSpecSchema.safeParse({
        ...EPICURVE_SPEC,
        series: [{ column: "" }],
      }).success,
    ).toBe(false);
  });
});
