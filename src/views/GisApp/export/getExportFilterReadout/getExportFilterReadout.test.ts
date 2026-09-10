import { afterEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { getExportFilterReadout } from "@/views/GisApp/export/getExportFilterReadout/getExportFilterReadout";

const AOI_POLYGON: AvaMapConfig.AoiPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [29.0, -1.5],
      [29.1, -1.5],
      [29.1, -1.4],
      [29.0, -1.4],
      [29.0, -1.5],
    ],
  ],
};

describe("getExportFilterReadout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports no readout when neither a time range nor an AOI is applied", () => {
    const config = AvaMapConfig.makeEmpty();

    expect(getExportFilterReadout(config)).toEqual({
      timeWindow: undefined,
      hasAoi: false,
    });
  });

  it("formats the stored inclusive ISO-8601 range into a time entry", () => {
    const config = {
      ...AvaMapConfig.makeEmpty(),
      timeRange: {
        start: "2026-08-01T00:00:00.000Z",
        end: "2026-08-18T23:59:59.999Z",
      },
    };

    const readout = getExportFilterReadout(config);

    expect(readout.timeWindow).toBeDefined();
    expect(readout.timeWindow).toContain("2026");
    expect(readout.hasAoi).toBe(false);
  });

  it("reports an AOI entry when an area of interest is applied", () => {
    const config = { ...AvaMapConfig.makeEmpty(), aoi: AOI_POLYGON };

    expect(getExportFilterReadout(config)).toEqual({
      timeWindow: undefined,
      hasAoi: true,
    });
  });

  it("reports both a time entry and an AOI entry when both are applied", () => {
    const config = {
      ...AvaMapConfig.makeEmpty(),
      aoi: AOI_POLYGON,
      timeRange: {
        start: "2026-08-01T00:00:00.000Z",
        end: "2026-08-18T23:59:59.999Z",
      },
    };

    const readout = getExportFilterReadout(config);

    expect(readout.timeWindow).toBeDefined();
    expect(readout.hasAoi).toBe(true);
  });

  it("carries no geometry in the AOI entry", () => {
    const config = { ...AvaMapConfig.makeEmpty(), aoi: AOI_POLYGON };

    const readout = getExportFilterReadout(config);

    expect(readout).not.toHaveProperty("aoi");
    expect(readout).not.toHaveProperty("geometry");
    expect(readout).not.toHaveProperty("coordinates");
    expect(typeof readout.hasAoi).toBe("boolean");
  });

  it("renders the month name in the reader's own locale", () => {
    const config = {
      ...AvaMapConfig.makeEmpty(),
      timeRange: {
        start: "2026-08-01T00:00:00.000Z",
        end: "2026-08-18T23:59:59.999Z",
      },
    };

    vi.stubGlobal("navigator", { language: "en-US" });
    const englishReadout = getExportFilterReadout(config);
    vi.stubGlobal("navigator", { language: "fr-FR" });
    const frenchReadout = getExportFilterReadout(config);

    expect(englishReadout.timeWindow).toContain("Aug");
    expect(frenchReadout.timeWindow).toContain("août");
    expect(englishReadout.timeWindow).not.toBe(frenchReadout.timeWindow);
  });

  it("pins the printed day to UTC, not the exporting machine's zone", () => {
    const config = {
      ...AvaMapConfig.makeEmpty(),
      timeRange: {
        start: "2026-08-01T00:00:00.000Z",
        end: "2026-08-18T23:59:59.999Z",
      },
    };

    expect(getExportFilterReadout(config).timeWindow).toBe(
      "1 Aug 2026 - 18 Aug 2026",
    );
  });
});
