import { describe, expect, it, vi } from "vitest";
import {
  findSimplifyToleranceUnderLimit,
  getProblemsFromBoundaries,
  makeCsvTextFromRows,
  makeToleranceLadder,
} from "./mozambiqueBoundaryHelpers";

describe("makeToleranceLadder", () => {
  it("starts at no simplification and climbs by one step up to the maximum", () => {
    expect(
      makeToleranceLadder({ stepDegrees: 0.00025, maxDegrees: 0.001 }),
    ).toEqual([0, 0.00025, 0.0005, 0.00075, 0.001]);
  });
});

describe("findSimplifyToleranceUnderLimit", () => {
  it("returns the first tolerance whose CSV is under the limit without trying later ones", async () => {
    const sizesByTolerance = new Map([
      [0, 12],
      [1, 8],
      [2, 4],
    ]);
    const makeCsvText = vi.fn((tolerance: number) => {
      return Promise.resolve("x".repeat(sizesByTolerance.get(tolerance) ?? 0));
    });

    const found = await findSimplifyToleranceUnderLimit({
      tolerances: [0, 1, 2],
      limitBytes: 10,
      makeCsvText,
    });

    expect(found).toEqual({
      tolerance: 1,
      csvText: "x".repeat(8),
      byteSize: 8,
    });
    expect(makeCsvText).toHaveBeenCalledTimes(2);
  });

  it("measures UTF-8 bytes, not characters", async () => {
    const found = await findSimplifyToleranceUnderLimit({
      tolerances: [0, 1],
      limitBytes: 4,
      makeCsvText: (tolerance) => {
        // "é" is two bytes, so two of them are four bytes, not two.
        return Promise.resolve(tolerance === 0 ? "éé" : "é");
      },
    });

    expect(found.tolerance).toBe(1);
  });

  it("names the size at the last tolerance when no tolerance fits", async () => {
    await expect(
      findSimplifyToleranceUnderLimit({
        tolerances: [0, 1],
        limitBytes: 2,
        makeCsvText: (tolerance) => {
          return Promise.resolve(tolerance === 0 ? "xxxx" : "xxx");
        },
      }),
    ).rejects.toThrow(
      "Even at 1 degrees, the largest tolerance, the file is 3 bytes, not under 2.",
    );
  });
});

describe("makeCsvTextFromRows", () => {
  it("quotes only the fields that hold a comma, a quote, or a line break", () => {
    expect(
      makeCsvTextFromRows({
        header: ["code", "name", "geometry"],
        rows: [["MZ-P", 'Cabo "Delgado"', "POLYGON ((1 2, 3 4, 1 2))"]],
      }),
    ).toBe(
      'code,name,geometry\nMZ-P,"Cabo ""Delgado""","POLYGON ((1 2, 3 4, 1 2))"\n',
    );
  });
});

describe("getProblemsFromBoundaries", () => {
  it("finds nothing wrong when every code is unique and every district has a province", () => {
    expect(
      getProblemsFromBoundaries({
        provinceCodes: ["P1", "P2"],
        districts: [
          { code: "D1", name: "Ancuabe", provinceCode: "P1" },
          { code: "D2", name: "Ibo", provinceCode: "P2" },
        ],
      }),
    ).toEqual([]);
  });

  it("reports a district that lies in no province", () => {
    expect(
      getProblemsFromBoundaries({
        provinceCodes: ["P1"],
        districts: [{ code: "D2", name: "Ibo", provinceCode: undefined }],
      }),
    ).toEqual(['district "Ibo" (D2) lies in no province']);
  });

  it("reports a province code and a district code that repeat", () => {
    expect(
      getProblemsFromBoundaries({
        provinceCodes: ["P1", "P1"],
        districts: [
          { code: "D1", name: "Ancuabe", provinceCode: "P1" },
          { code: "D1", name: "Ancuabe", provinceCode: "P1" },
        ],
      }),
    ).toEqual([
      'province code "P1" is not unique',
      'district code "D1" is not unique',
    ]);
  });
});
