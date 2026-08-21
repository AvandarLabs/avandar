import { describe, expect, it } from "vitest";
import { groupLines } from "./groupLines";
import type { TextItem } from "../pdfSniff.types";

function textItem(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

describe("groupLines", () => {
  it("groups items sharing a baseline into one line", () => {
    const lines = groupLines([
      textItem("District", 100, 600),
      textItem("Cases", 250, 600),
      textItem("Deaths", 400, 600),
    ]);

    expect(lines).toHaveLength(1);
    expect(
      lines[0]!.items.map((i) => {
        return i.text;
      }),
    ).toEqual(["District", "Cases", "Deaths"]);
  });

  it("tolerates sub-point baseline jitter within a line", () => {
    // Baselines drift by a fraction of a point within a row. Treating that as
    // a new line would produce one line per cell.
    const lines = groupLines([
      textItem("Gao", 100, 580),
      textItem("1204", 250, 580.4),
      textItem("31", 400, 579.7),
    ]);

    expect(lines).toHaveLength(1);
  });

  it("returns lines top to bottom", () => {
    // PDF y grows upward, so the largest y is the topmost line.
    const lines = groupLines([
      textItem("bottom", 100, 100),
      textItem("top", 100, 700),
      textItem("middle", 100, 400),
    ]);

    expect(
      lines.map((l) => {
        return l.items[0]!.text;
      }),
    ).toEqual(["top", "middle", "bottom"]);
  });

  it("sorts items within a line left to right", () => {
    const lines = groupLines([
      textItem("third", 400, 600),
      textItem("first", 100, 600),
      textItem("second", 250, 600),
    ]);

    expect(
      lines[0]!.items.map((i) => {
        return i.text;
      }),
    ).toEqual(["first", "second", "third"]);
  });

  it("reports each line's baseline and text", () => {
    const lines = groupLines([
      textItem("Responses:", 100, 600),
      textItem("Providing", 160, 600),
    ]);

    expect(lines[0]!.y).toBeCloseTo(600, 5);
    expect(lines[0]!.text).toBe("Responses: Providing");
  });

  it("returns an empty array for no items", () => {
    expect(groupLines([])).toEqual([]);
  });
});
