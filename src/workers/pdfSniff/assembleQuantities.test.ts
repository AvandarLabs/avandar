import { describe, expect, it } from "vitest";
import { assembleQuantities } from "./assembleQuantities";
import type { TextItem } from "./types";

function item(text: string, x: number, y: number, width?: number): TextItem {
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

/** The OCHA funding bar, as pdf.js actually delivers it. */
function fundingBar(): readonly TextItem[] {
  return [
    item("WASH", 334.34, 426.04, 16.44),
    item("3", 513.06, 425.9, 3.63),
    item("M", 516.7, 425.9, 5.42),
    item(" ", 522.11, 425.9, 0.23),
    item("(15%)", 523.77, 425.9, 15.78),
  ];
}

describe("assembleQuantities", () => {
  it("reads a number, its magnitude suffix and its share as one quantity", () => {
    const { quantities } = assembleQuantities(fundingBar());

    expect(quantities).toHaveLength(1);
    expect(quantities[0]!.text).toBe("3 M (15%)");
    expect(quantities[0]!.value).toBe("3000000");
  });

  it("keeps the magnitude suffix out of the labels", () => {
    // The defect this exists to fix: "M (15%)" assembled into a label of its
    // own, sitting 13 points from the figure while the pillar name it belongs
    // to was 172 points away, so every bar paired with its own unit.
    const { labelItems } = assembleQuantities(fundingBar());

    expect(
      labelItems.map((textItem) => {
        return textItem.text;
      }),
    ).toEqual(["WASH"]);
  });

  it("anchors the quantity on the numeral, not on the whole run", () => {
    // The figure is printed where the numeral is. A trailing suffix or share
    // extends the run to the right without moving the figure, and pairing on
    // the run's centre pushes each bar's amount towards the next row's label.
    const { quantities } = assembleQuantities(fundingBar());

    expect(quantities[0]!.item.x).toBe(513.06);
    expect(quantities[0]!.item.width).toBe(3.63);
    // Provenance still covers everything that was read.
    expect(quantities[0]!.bbox[0]).toBe(513.06);
    expect(quantities[0]!.bbox[1]).toBe(425.9);
    expect(quantities[0]!.bbox[2]).toBeCloseTo(539.55, 5);
    expect(quantities[0]!.bbox[3]).toBeCloseTo(433.9, 5);
  });

  it("scales a spelled-out magnitude word", () => {
    const { quantities } = assembleQuantities([
      item("1.2", 100, 300, 12),
      item("million", 113, 300, 30),
    ]);

    expect(quantities[0]!.value).toBe("1200000");
    expect(quantities[0]!.unit).toBe("n");
  });

  it("scales a thousands suffix", () => {
    const { quantities } = assembleQuantities([
      item("450", 100, 300, 12),
      item("K", 113, 300, 6),
    ]);

    expect(quantities[0]!.value).toBe("450000");
  });

  it("leaves a distant token alone", () => {
    // 20 points of white space is a neighbouring column, not a suffix. This
    // is `assembleLabels`' own gap test, which is the point of sharing it.
    const { quantities, labelItems } = assembleQuantities([
      item("3", 100, 300, 4),
      item("M", 124, 300, 5),
    ]);

    expect(quantities[0]!.value).toBe("3");
    expect(
      labelItems.map((textItem) => {
        return textItem.text;
      }),
    ).toEqual(["M"]);
  });

  it("leaves a token on another line alone", () => {
    const { quantities, labelItems } = assembleQuantities([
      item("3", 100, 300, 4),
      item("M", 104, 288, 5),
    ]);

    expect(quantities[0]!.value).toBe("3");
    expect(labelItems).toHaveLength(1);
  });

  it("reads a percent sign that arrived as its own item", () => {
    const { quantities, labelItems } = assembleQuantities([
      item("2.6", 100, 300, 12),
      item("%", 113, 300, 5),
    ]);

    expect(quantities[0]!.value).toBe("2.6");
    expect(quantities[0]!.unit).toBe("percent");
    expect(labelItems).toHaveLength(0);
  });

  it("reads a percent that pdf.js delivered whole", () => {
    const { quantities } = assembleQuantities([item("2.6%", 100, 300, 20)]);

    expect(quantities[0]!.value).toBe("2.6");
    expect(quantities[0]!.unit).toBe("percent");
  });

  it("reads a currency symbol as the unit, leading or trailing", () => {
    const leading = assembleQuantities([item("$3,000", 100, 300, 25)]);
    const trailing = assembleQuantities([
      item("3,000", 100, 300, 20),
      item("US$", 121, 300, 12),
    ]);

    expect(leading.quantities[0]!.value).toBe("3000");
    expect(leading.quantities[0]!.unit).toBe("usd");
    expect(trailing.quantities[0]!.value).toBe("3000");
    expect(trailing.quantities[0]!.unit).toBe("usd");
  });

  it("treats a parenthesised share as an annotation, not as the unit", () => {
    // "3 M (15%)" is three million, of which 15% is a second figure about the
    // same bar. Reading the share as the unit would say the bar IS 3%.
    const { quantities } = assembleQuantities(fundingBar());

    expect(quantities[0]!.unit).toBe("n");
  });

  it("does not merge two numbers", () => {
    // A choropleth legend's bin boundaries sit side by side. Neither is the
    // other's magnitude.
    const { quantities } = assembleQuantities([
      item("10", 100, 50, 10),
      item("500", 111, 50, 15),
    ]);

    expect(
      quantities.map((quantity) => {
        return quantity.value;
      }),
    ).toEqual(["10", "500"]);
  });

  it("returns quantities and labels in the region's own order", () => {
    // Label order decides how `assembleLabels` agglomerates and how ties
    // break during pairing, so scanning left to right must not reorder what
    // comes out.
    const { quantities, labelItems } = assembleQuantities([
      item("KHARTOUM", 480, 302, 45),
      item("408", 490, 292, 15),
      item("KASSALA", 560, 402, 40),
      item("200", 566, 392, 15),
    ]);

    expect(
      quantities.map((quantity) => {
        return quantity.value;
      }),
    ).toEqual(["408", "200"]);
    expect(
      labelItems.map((textItem) => {
        return textItem.text;
      }),
    ).toEqual(["KHARTOUM", "KASSALA"]);
  });

  it("leaves a plain figure exactly as normalizeCellValue leaves it", () => {
    const { quantities } = assembleQuantities([item("1,234", 100, 300, 20)]);

    expect(quantities[0]!.value).toBe("1234");
    expect(quantities[0]!.unit).toBe("n");
    expect(quantities[0]!.item.text).toBe("1,234");
  });

  it("drops whitespace-only items from both halves", () => {
    const { quantities, labelItems } = assembleQuantities([
      item("408", 100, 300, 12),
      item(" ", 112, 300, 8),
    ]);

    expect(quantities).toHaveLength(1);
    expect(labelItems).toHaveLength(0);
  });
});
