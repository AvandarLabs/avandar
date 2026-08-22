import { describe, expect, it } from "vitest";
import { assembleLabels } from "./assembleLabels";
import type { TextItem } from "../pdfSniff.types";

function label(text: string, x: number, y: number, width?: number): TextItem {
  return {
    text,
    x,
    y,
    width: width ?? text.length * 5,
    height: 8,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

describe("assembleLabels", () => {
  it("merges two words on the same line into one label", () => {
    // Regression: an earlier implementation compared centre distances, which
    // never merges long words, and split RED SEA into RED and SEA.
    const merged = assembleLabels([
      label("RED", 100, 500, 20),
      label("SEA", 123, 500, 20),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.text).toBe("RED SEA");
  });

  it("merges a name wrapped onto a second line", () => {
    const merged = assembleLabels([
      label("NORTH", 100, 500, 30),
      label("DARFUR", 98, 492, 34),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.text).toBe("NORTH DARFUR");
  });

  it("does not fuse two neighbouring labels on a dense map", () => {
    // Regression: KHARTOUM and KASSALA sit close together on the OCHA map.
    // An earlier implementation merged them into one label, which then
    // attracted both of their values.
    const merged = assembleLabels([
      label("KHARTOUM", 480, 500, 45),
      label("KASSALA", 540, 495, 40),
    ]);

    expect(merged).toHaveLength(2);
    expect(
      merged
        .map((m) => {
          return m.text;
        })
        .sort(),
    ).toEqual(["KASSALA", "KHARTOUM"]);
  });

  it("does not stack two labels that are merely near each other", () => {
    // Same y-gap as a wrapped name, but the x centres are far apart.
    const merged = assembleLabels([
      label("SENNAR", 100, 500, 35),
      label("GEDAREF", 200, 492, 40),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("reports the merged centroid, not the first item's position", () => {
    const [merged] = assembleLabels([
      label("RED", 100, 500, 20),
      label("SEA", 123, 500, 20),
    ]);

    // Centre of the union box: x from 100 to 143.
    expect(merged!.cx).toBeCloseTo(121.5, 1);
    expect(merged!.cy).toBeCloseTo(504, 1);
  });

  it("merges three fragments into one label", () => {
    const merged = assembleLabels([
      label("WEST", 100, 500, 25),
      label("NORTH", 128, 500, 30),
      label("KORDOFAN", 100, 492, 50),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.text).toBe("WEST NORTH KORDOFAN");
  });

  it("returns an empty array for no items", () => {
    expect(assembleLabels([])).toEqual([]);
  });
});
