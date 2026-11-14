import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { CONTEXT } from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import {
  CASE_COLUMN,
  COUNTY_COLUMN,
  KINGS_LAYOUT_ID,
  makeColumnFill,
  makeMappedDraft,
  makeMapping,
  ONSET_COLUMN,
  SEX_COLUMN,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalkSteps.fixtures";
import { MappingTable } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingTable/MappingTable";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

function _renderTable(
  draft: CrosswalkDraft.T = makeMappedDraft(),
  selectedColumnId: CrosswalkColumn.Id | undefined = undefined,
) {
  const onSelectColumn = vi.fn();
  render(
    <MappingTable
      draft={draft}
      layoutId={KINGS_LAYOUT_ID}
      entriesById={CONTEXT.entriesById}
      selectedColumnId={selectedColumnId}
      onSelectColumn={onSelectColumn}
    />,
  );
  return { onSelectColumn };
}

function _row(columnName: string): HTMLElement {
  const row = screen.getByRole("button", { name: columnName }).closest("tr");
  if (!row) {
    throw new Error(`No row for ${columnName}`);
  }
  return row;
}

/**
 * A row's three cells, by heading. A source column can share its name with
 * the combined dataset's column, so each cell is searched on its own.
 */
function _cells(columnName: string) {
  const [column, filledFrom, match] = within(_row(columnName)).getAllByRole(
    "cell",
  );
  if (!column || !filledFrom || !match) {
    throw new Error(`The row for ${columnName} lacks a cell`);
  }
  return {
    column: within(column),
    filledFrom: within(filledFrom),
    match: within(match),
  };
}

/**
 * How the row's connector line is drawn. The Code list badge also carries a
 * `data-variant`, so the line is the decorative one.
 */
function _lineOf(columnName: string): Element | null {
  return _row(columnName).querySelector('[aria-hidden="true"][data-variant]');
}

/** The mapped draft with Kings' fills replaced. */
function _withKingsFills(
  fills: Readonly<Record<string, CrosswalkDraft.Mapping>>,
): CrosswalkDraft.T {
  const draft = makeMappedDraft();
  return {
    ...draft,
    mappings: { ...draft.mappings, [KINGS_LAYOUT_ID]: fills },
  };
}

describe("MappingTable", () => {
  it("heads its three columns", () => {
    _renderTable();

    expect(
      screen.getByRole("columnheader", {
        name: "Column of the combined dataset",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Filled from this dataset" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Match" }),
    ).toBeInTheDocument();
  });

  it("shows a confirmed match with a solid line", () => {
    _renderTable();

    const cells = _cells(CASE_COLUMN.name);
    expect(cells.column.getByText("Text")).toBeInTheDocument();
    expect(cells.filledFrom.getByText("case_id")).toBeInTheDocument();
    expect(cells.match.getByText("Name and type · 100%")).toBeInTheDocument();
    expect(cells.match.queryByText("Suggested")).not.toBeInTheDocument();
    expect(_lineOf(CASE_COLUMN.name)).toHaveAttribute("data-variant", "solid");
    expect(_lineOf(CASE_COLUMN.name)).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a suggested code translation on a governed column with a dashed line", () => {
    _renderTable();

    const cells = _cells(SEX_COLUMN.name);
    expect(cells.column.getByText("Code list")).toBeInTheDocument();
    expect(cells.filledFrom.getByText("GENDER")).toBeInTheDocument();
    expect(
      cells.filledFrom.getByText("Translated with Sex (1/2/9)"),
    ).toBeInTheDocument();
    expect(cells.match.getByText("Same values · 91%")).toBeInTheDocument();
    expect(cells.match.getByText("Suggested")).toBeInTheDocument();
    expect(_lineOf(SEX_COLUMN.name)).toHaveAttribute("data-variant", "dashed");
  });

  it("describes a date read in the user's terms", () => {
    _renderTable();

    const cells = _cells(ONSET_COLUMN.name);
    expect(cells.column.getByText("Date")).toBeInTheDocument();
    expect(cells.filledFrom.getByText("onset_dt")).toBeInTheDocument();
    expect(
      cells.filledFrom.getByText("Read as a date (MM/DD/YYYY)"),
    ).toBeInTheDocument();
  });

  it("says when a column is not filled yet, with no line", () => {
    _renderTable();

    expect(
      _cells(COUNTY_COLUMN.name).filledFrom.getByText("Not filled yet"),
    ).toBeInTheDocument();
    expect(_lineOf(COUNTY_COLUMN.name)).toHaveAttribute("data-variant", "none");
  });

  it("describes every other kind of fill", () => {
    _renderTable(
      _withKingsFills({
        [CASE_COLUMN.id]: makeMapping({ kind: "constant", value: "Kings" }),
        [SEX_COLUMN.id]: makeMapping(
          makeColumnFill("GENDER", {
            codeListId: "deleted-list" as DataDictionaryCodeList.Id,
          }),
        ),
        [ONSET_COLUMN.id]: makeMapping({
          kind: "expression",
          sql: "concat({first_name}, ' ', {last_name})",
        }),
        [COUNTY_COLUMN.id]: makeMapping({ kind: "empty" }),
      }),
    );

    const caseCells = _cells(CASE_COLUMN.name);
    expect(caseCells.filledFrom.getByText("Kings")).toBeInTheDocument();
    expect(caseCells.filledFrom.getByText("Fixed value")).toBeInTheDocument();
    expect(
      _cells(SEX_COLUMN.name).filledFrom.getByText(
        "Translated with a code list that was deleted",
      ),
    ).toBeInTheDocument();
    const onsetCells = _cells(ONSET_COLUMN.name);
    expect(
      onsetCells.filledFrom.getByText("concat({first_name}, ' ', {last_name})"),
    ).toBeInTheDocument();
    expect(onsetCells.filledFrom.getByText("Combine")).toBeInTheDocument();
    expect(
      _cells(COUNTY_COLUMN.name).filledFrom.getByText("Leave empty"),
    ).toBeInTheDocument();
    expect(_lineOf(COUNTY_COLUMN.name)).toHaveAttribute("data-variant", "none");
  });

  it("describes each conversion", () => {
    _renderTable(
      _withKingsFills({
        [CASE_COLUMN.id]: makeMapping(
          makeColumnFill("case_id", {
            convert: { kind: "trim_and_fix_case", letterCase: "upper" },
          }),
        ),
        [COUNTY_COLUMN.id]: makeMapping(
          makeColumnFill("county", {
            convert: { kind: "trim_and_fix_case", letterCase: "keep" },
          }),
        ),
        [ONSET_COLUMN.id]: makeMapping(
          makeColumnFill("onset_dt", {
            convert: { kind: "multiply", factor: 1 / 12 },
          }),
        ),
        [SEX_COLUMN.id]: makeMapping(
          makeColumnFill("GENDER", {
            convert: { kind: "pad_text", length: 5 },
          }),
          { status: "suggested", reason: "similar_layout" },
        ),
      }),
    );

    expect(
      _cells(CASE_COLUMN.name).filledFrom.getByText(
        "Spaces trimmed, UPPERCASE",
      ),
    ).toBeInTheDocument();
    expect(
      _cells(COUNTY_COLUMN.name).filledFrom.getByText("Spaces trimmed"),
    ).toBeInTheDocument();
    expect(
      _cells(ONSET_COLUMN.name).filledFrom.getByText("Multiplied by 0.083333"),
    ).toBeInTheDocument();
    const sexCells = _cells(SEX_COLUMN.name);
    expect(
      sexCells.filledFrom.getByText("Padded with zeros to 5"),
    ).toBeInTheDocument();
    expect(
      sexCells.match.getByText("From a similar layout"),
    ).toBeInTheDocument();
  });

  it("selects a column from its name or anywhere on its row", () => {
    const { onSelectColumn } = _renderTable(makeMappedDraft(), CASE_COLUMN.id);

    expect(
      screen.getByRole("button", { name: CASE_COLUMN.name }),
    ).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: SEX_COLUMN.name }));
    expect(onSelectColumn).toHaveBeenCalledTimes(1);
    expect(onSelectColumn).toHaveBeenCalledWith(SEX_COLUMN.id);

    fireEvent.click(
      _cells(COUNTY_COLUMN.name).filledFrom.getByText("Not filled yet"),
    );
    expect(onSelectColumn).toHaveBeenLastCalledWith(COUNTY_COLUMN.id);
  });
});
