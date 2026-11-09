import jsPDF from "jspdf";
import { describe, expect, it } from "vitest";
import { createPdfTextMeasurer } from "@/views/GisApp/export/composeExportPdf/createPdfTextMeasurer/createPdfTextMeasurer";
import { drawExportFeatureTable } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
import type {
  ExportFeatureTable,
  ExportFeatureTablePage,
  ExportTextMeasurer,
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

/** One millimetre per character, in either weight, so layout is predictable. */
const CHARACTER_MEASURER: ExportTextMeasurer = {
  wrapText: (text, widthMm) => {
    return _wrapByCharacters(text, widthMm);
  },
  getTextWidthMm: (text) => {
    return text.length;
  },
};

/** States the column cut the way the localized copy does, in English. */
function _buildColumnLimitNote(
  columnCounts: Readonly<{ shownCount: number; totalCount: number }>,
): string {
  return `Showing ${columnCounts.shownCount} of ${columnCounts.totalCount} columns.`;
}

/** A two-column table of `rowCount` schools. */
function _table(
  rowCount: number,
  overrides: Partial<ExportFeatureTable> = {},
): ExportFeatureTable {
  return {
    summaryLine: `${rowCount} Schools`,
    truncationNote: undefined,
    buildColumnLimitNote: _buildColumnLimitNote,
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
    measurer: CHARACTER_MEASURER,
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

  it("prints only as many columns as fit at the minimum width, in order", () => {
    const headerLabels = Array.from({ length: 20 }, (_, index) => {
      return `C${index}`;
    });
    const pages = _pages(
      _table(1, {
        headerLabels,
        rows: [
          headerLabels.map((label) => {
            return `${label} value`;
          }),
        ],
      }),
    );

    expect(_headerLabels(pages[0]!)).toEqual(headerLabels.slice(0, 8));
  });

  it("notes the left out columns in place of the row truncation note", () => {
    const headerLabels = Array.from({ length: 20 }, (_, index) => {
      return `C${index}`;
    });
    const pages = _pages(
      _table(0, { headerLabels, truncationNote: "Showing 0 of 90." }),
    );
    const texts = pages[0]!.texts.map((text) => {
      return text.text;
    });

    expect(texts.slice(0, 2)).toEqual([
      "0 Schools",
      "Showing 8 of 20 columns.",
    ]);
    expect(texts).not.toContain("Showing 0 of 90.");
  });

  it("adds no column note when every column fits", () => {
    const pages = _pages(_table(0));

    expect(
      pages[0]!.texts.some((text) => {
        return text.text.includes("columns");
      }),
    ).toBe(false);
  });
});

/** An A4 landscape page's header-to-footer span, in millimetres. */
const A4_BLOCK = { x: 12, y: 12, width: 273, height: 170 };

/** Real jsPDF Helvetica metrics at the composer's body size. */
function _createRealMeasurer(): ExportTextMeasurer {
  const document = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "landscape",
  });
  return createPdfTextMeasurer({ document, fontSizePt: 9 });
}

describe("drawExportFeatureTable with real jsPDF text measurement", () => {
  it("keeps every printed line of a 40-column table readable and in bounds", () => {
    const measurer = _createRealMeasurer();
    const headerLabels = Array.from({ length: 40 }, (_, index) => {
      return `Column ${index}`;
    });
    const pages = drawExportFeatureTable({
      block: A4_BLOCK,
      table: _table(5, {
        headerLabels,
        rows: Array.from({ length: 5 }, (_, rowIndex) => {
          return headerLabels.map((_label, columnIndex) => {
            return `Value ${rowIndex}-${columnIndex}`;
          });
        }),
      }),
      measurer,
    });
    const headers = _headerLabels(pages[0]!);
    const columnTextWidthMm = A4_BLOCK.width / headers.length - 3;
    const bodyTexts = pages[0]!.texts.filter((text) => {
      return !text.isHeader && text.text.startsWith("Value ");
    });

    expect(headers.length).toBeGreaterThan(1);
    expect(headers.length).toBeLessThan(40);
    expect(headers).toEqual(headerLabels.slice(0, headers.length));
    expect(
      bodyTexts.map((text) => {
        return text.text;
      }),
    ).toContain(`Value 4-${headers.length - 1}`);
    pages[0]!.texts.slice(2).forEach((text) => {
      expect(text.text.length).toBeGreaterThan(0);
      expect(
        measurer.getTextWidthMm(text.text, { isBold: text.isHeader }),
      ).toBeLessThanOrEqual(columnTextWidthMm);
    });
  });

  it("wraps a long header within its column at the bold weight it prints in", () => {
    const measurer = _createRealMeasurer();
    const longHeader = "Distance to the nearest exposure site in miles";
    const pages = drawExportFeatureTable({
      block: A4_BLOCK,
      table: _table(0, {
        headerLabels: [
          longHeader,
          ...Array.from({ length: 9 }, () => {
            return "x";
          }),
        ],
      }),
      measurer,
    });
    const headerLines = pages[0]!.texts.filter((text) => {
      return text.isHeader && text.xMm === A4_BLOCK.x + 1.5;
    });

    expect(headerLines.length).toBeGreaterThan(1);
    expect(
      headerLines
        .map((line) => {
          return line.text;
        })
        .join(" "),
    ).toBe(longHeader);
    headerLines.forEach((line) => {
      expect(
        measurer.getTextWidthMm(line.text, { isBold: true }),
      ).toBeLessThanOrEqual(A4_BLOCK.width / 10 - 3);
    });
  });

  it("fits the trailing ellipsis of a cut cell inside its column", () => {
    const measurer = _createRealMeasurer();
    const pages = drawExportFeatureTable({
      block: A4_BLOCK,
      table: _table(1, {
        headerLabels: [
          "Notes",
          ...Array.from({ length: 9 }, () => {
            return "x";
          }),
        ],
        rows: [
          [
            "word ".repeat(200),
            ...Array.from({ length: 9 }, () => {
              return "y";
            }),
          ],
        ],
      }),
      measurer,
    });
    const cellLines = pages[0]!.texts.filter((text) => {
      return !text.isHeader && text.text.startsWith("word");
    });

    expect(cellLines).toHaveLength(4);
    expect(cellLines[3]!.text.endsWith("...")).toBe(true);
    expect(
      measurer.getTextWidthMm(cellLines[3]!.text, { isBold: false }),
    ).toBeLessThanOrEqual(A4_BLOCK.width / 10 - 3);
  });
});
