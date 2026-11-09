import { describe, expect, it } from "vitest";
import { drawExportFeatureTable } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
import type {
  ExportFeatureTable,
  ExportFeatureTablePage,
} from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";

/**
 * 200 mm wide, so each of two columns is 100 mm. 70 mm tall: the first page
 * spends 7 mm on the summary and 7 mm on the header, leaving room for exactly
 * 8 rows of 7 mm. Later pages spend only the header, leaving room for 9.
 */
const BLOCK = { x: 10, y: 20, width: 200, height: 70 };

/** One millimetre holds one character, so wrapping is predictable. */
function _wrapByCharacters(text: string, widthMm: number): string[] {
  const size = Math.max(1, Math.floor(widthMm));
  if (text.length === 0) {
    return [""];
  }
  return Array.from({ length: Math.ceil(text.length / size) }, (_, index) => {
    return text.slice(index * size, (index + 1) * size);
  });
}

/** A two-column table of `rowCount` schools. */
function _table(
  rowCount: number,
  overrides: Partial<ExportFeatureTable> = {},
): ExportFeatureTable {
  return {
    summaryLine: `${rowCount} Schools`,
    truncationNote: undefined,
    headerLabels: ["School", "Distance"],
    rows: Array.from({ length: rowCount }, (_, index) => {
      return [`School ${index}`, `${index} mi`];
    }),
    ...overrides,
  };
}

function _pages(table: ExportFeatureTable): ExportFeatureTablePage[] {
  return drawExportFeatureTable({
    block: BLOCK,
    table,
    wrapText: _wrapByCharacters,
  });
}

/** The first column's body text on one page, top to bottom. */
function _schoolNames(page: ExportFeatureTablePage): string[] {
  return page.texts
    .filter((text) => {
      return !text.isHeader && text.text.startsWith("School ");
    })
    .map((text) => {
      return text.text;
    });
}

/** The header labels on one page. */
function _headerLabels(page: ExportFeatureTablePage): string[] {
  return page.texts
    .filter((text) => {
      return text.isHeader;
    })
    .map((text) => {
      return text.text;
    });
}

describe("drawExportFeatureTable", () => {
  it("prints the summary and header on one page when there are no rows", () => {
    const pages = _pages(_table(0));

    expect(pages).toHaveLength(1);
    expect(
      pages[0]!.texts.map((text) => {
        return text.text;
      }),
    ).toEqual(["0 Schools", "School", "Distance"]);
  });

  it("prints a single row on the first page", () => {
    const pages = _pages(_table(1));

    expect(pages).toHaveLength(1);
    expect(_schoolNames(pages[0]!)).toEqual(["School 0"]);
  });

  it("keeps exactly one page of rows on one page", () => {
    expect(_pages(_table(8))).toHaveLength(1);
  });

  it("starts a second page with a repeated header when one more row arrives", () => {
    const pages = _pages(_table(9));

    expect(pages).toHaveLength(2);
    expect(_headerLabels(pages[1]!)).toEqual(["School", "Distance"]);
    expect(_schoolNames(pages[1]!)).toEqual(["School 8"]);
  });

  it("prints every row once, in order, across many pages", () => {
    const pages = _pages(_table(30));

    expect(pages).toHaveLength(4);
    expect(pages.flatMap(_schoolNames)).toEqual(
      Array.from({ length: 30 }, (_, index) => {
        return `School ${index}`;
      }),
    );
  });

  it("starts each later page's header at the top of the block", () => {
    const pages = _pages(_table(9));

    expect(pages[1]!.headerRuleYMm).toBe(BLOCK.y + 7);
    expect(pages[0]!.headerRuleYMm).toBe(BLOCK.y + 14);
  });

  it("prints the truncation note under the summary on the first page only", () => {
    const note =
      "Showing 30 of 90. Download the full list as CSV from the map.";
    const pages = _pages(_table(30, { truncationNote: note }));
    const firstPageTexts = pages[0]!.texts.map((text) => {
      return text.text;
    });

    expect(firstPageTexts.slice(0, 2)).toEqual(["30 Schools", note]);
    expect(
      pages.slice(1).some((page) => {
        return page.texts.some((text) => {
          return text.text === note;
        });
      }),
    ).toBe(false);
  });

  it("wraps a long cell onto lines below each other", () => {
    const longName = "x".repeat(150);
    const pages = _pages(_table(1, { rows: [[longName, "1 mi"]] }));
    const cellLines = pages[0]!.texts.filter((text) => {
      return !text.isHeader && text.text.startsWith("x");
    });

    expect(
      cellLines.map((line) => {
        return line.text.length;
      }),
    ).toEqual([97, 53]);
    expect(cellLines[1]!.yMm - cellLines[0]!.yMm).toBe(4);
  });

  it("cuts a cell at four lines and marks the cut", () => {
    const pages = _pages(_table(1, { rows: [["y".repeat(1000), "1 mi"]] }));
    const cellLines = pages[0]!.texts.filter((text) => {
      return !text.isHeader && text.text.startsWith("y");
    });

    expect(cellLines).toHaveLength(4);
    expect(cellLines[3]!.text.endsWith("...")).toBe(true);
  });

  it("prints characters the PDF font lacks as safe text", () => {
    const pages = _pages(
      _table(1, { headerLabels: ["≥ 95%", "Name"], rows: [["0.98", "東京"]] }),
    );
    const texts = pages[0]!.texts.map((text) => {
      return text.text;
    });

    expect(texts).toContain(">= 95%");
    expect(texts).toContain("??");
  });
});
