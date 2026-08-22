import { describe, expect, it } from "vitest";

import { makeCsvFromPdfTable } from "./makeCsvFromPdfTable";

describe("makeCsvFromPdfTable", () => {
  it("uses the header rows as column names", () => {
    const csv = makeCsvFromPdfTable({
      cells: [
        ["District", "Cases"],
        ["Gao", "1204"],
      ],
      headerRows: 1,
    });

    expect(csv).toBe("District,Cases\nGao,1204");
  });

  it("flattens spanning headers with a space", () => {
    // "2024" over "Q1" becomes "2024 Q1", which keeps the year that the
    // bottom row alone would lose.
    const csv = makeCsvFromPdfTable({
      cells: [
        ["", "2024", "2024", "2025", "2025"],
        ["Region", "Q1", "Q2", "Q1", "Q2"],
        ["Gao", "1", "2", "3", "4"],
      ],
      headerRows: 2,
    });

    expect(csv.split("\n")[0]).toBe("Region,2024 Q1,2024 Q2,2025 Q1,2025 Q2");
  });

  it("quotes values containing a comma", () => {
    const csv = makeCsvFromPdfTable({
      cells: [
        ["Name", "Note"],
        ["Gao", "big, busy"],
      ],
      headerRows: 1,
    });

    expect(csv).toBe('Name,Note\nGao,"big, busy"');
  });

  it("escapes embedded quotes", () => {
    const csv = makeCsvFromPdfTable({
      cells: [["Name"], ['He said "hi"']],
      headerRows: 1,
    });

    expect(csv).toBe('Name\n"He said ""hi"""');
  });

  it("disambiguates duplicate column names", () => {
    // A bottom-row-only header of Q1, Q2, Q1, Q2 would otherwise produce a
    // table with two columns of the same name.
    const csv = makeCsvFromPdfTable({
      cells: [
        ["Q1", "Q2", "Q1"],
        ["1", "2", "3"],
      ],
      headerRows: 1,
    });

    expect(csv.split("\n")[0]).toBe("Q1,Q2,Q1_2");
  });

  it("names a blank header column by position", () => {
    const csv = makeCsvFromPdfTable({
      cells: [
        ["", "Cases"],
        ["Gao", "1204"],
      ],
      headerRows: 1,
    });

    expect(csv.split("\n")[0]).toBe("column_1,Cases");
  });
});
