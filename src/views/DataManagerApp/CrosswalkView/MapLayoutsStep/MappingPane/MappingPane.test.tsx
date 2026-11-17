import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCodeListLookups } from "@/lib/crosswalks/buildCodeListLookups/buildCodeListLookups";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import {
  CASE_ID_COLUMN,
  columnFill,
  CONTEXT,
  DATASETS_BY_ID,
  GENDER_FILL,
  makeDraft,
  NYS_DICTIONARY_ID,
  ONSET_COLUMN,
  QUEENS_DATE_FORMATS,
  QUEENS_LAYOUT_ID,
  QUEENS_MARCH_ID,
  QUEENS_PROFILES,
  SEX_COLUMN,
  SEX_ENTRY_ID,
  SEX_LETTERS_LIST_ID,
  withFill,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import { MappingPane } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/MappingPane";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

const { useFillExampleMock } = vi.hoisted(() => {
  return { useFillExampleMock: vi.fn() };
});

vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample")
      >();
    return {
      ...original,
      useFillExample: useFillExampleMock,
    };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useDictionaryNames",
  () => {
    return {
      useDictionaryNames: () => {
        return new Map([[NYS_DICTIONARY_ID, "NYS codes"]]);
      },
    };
  },
);
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

function _render(
  options: Readonly<{
    column?: CrosswalkDraft.Column;
    fill?: CrosswalkMapping.Fill;
    status?: CrosswalkMapping.Status;
    draft?: CrosswalkDraft.T;
  }> = {},
) {
  const column = options.column ?? CASE_ID_COLUMN;
  const baseDraft = options.draft ?? makeDraft();
  const draft = options.fill
    ? withFill(baseDraft, {
        layoutId: QUEENS_LAYOUT_ID,
        columnId: column.id,
        fill: options.fill,
        status: options.status,
      })
    : baseDraft;
  const layout = draft.layouts.find((candidate) => {
    return candidate.id === QUEENS_LAYOUT_ID;
  });
  const dispatch = vi.fn();
  render(
    <MappingPane
      draft={draft}
      layout={layout!}
      column={column}
      sourceColumns={DATASETS_BY_ID.get(QUEENS_MARCH_ID)!.columns}
      profilesBySourceColumn={QUEENS_PROFILES}
      dateFormatsBySourceColumn={QUEENS_DATE_FORMATS}
      context={CONTEXT}
      dispatch={dispatch}
    />,
  );
  return dispatch;
}

function _expectFill(
  dispatch: ReturnType<typeof vi.fn>,
  columnId: string,
  fill: CrosswalkMapping.Fill,
) {
  expect(dispatch).toHaveBeenCalledWith({
    type: "fill_set",
    layoutId: QUEENS_LAYOUT_ID,
    columnId,
    fill,
  });
}

describe("MappingPane", () => {
  beforeEach(() => {
    useFillExampleMock.mockReset();
    useFillExampleMock.mockReturnValue({
      status: "ready",
      result: [
        { before: "1", after: "Male" },
        { before: "7", after: undefined },
      ],
    });
  });

  it("names the selected column and fills an unfilled one with a fixed value", () => {
    const dispatch = _render({ column: ONSET_COLUMN });

    expect(
      screen.getByRole("region", { name: "rash_onset_date" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Not filled yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "A fixed value" }));

    _expectFill(dispatch, ONSET_COLUMN.id, { kind: "constant", value: "" });
  });

  it("types a fixed value", () => {
    const dispatch = _render({
      column: ONSET_COLUMN,
      fill: { kind: "constant", value: "" },
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Value" }), {
      target: { value: "Bronx" },
    });

    _expectFill(dispatch, ONSET_COLUMN.id, {
      kind: "constant",
      value: "Bronx",
    });
  });

  it("fills from another column, with its example value", () => {
    const dispatch = _render();

    expect(screen.getByText("For example: Q-101")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Column" }));
    // Each option also shows an example value, so match on the column's start.
    const ageOption = screen
      .getAllByRole("option", { hidden: true })
      .find((option) => {
        return option.textContent?.startsWith("age_mo");
      })!;
    fireEvent.click(ageOption);

    _expectFill(dispatch, CASE_ID_COLUMN.id, columnFill("age_mo"));
  });

  it("reads text as a date with the format detected in it", () => {
    const dispatch = _render({
      column: ONSET_COLUMN,
      fill: columnFill("onset_dt"),
    });

    pickMantineSelectOption("Change the values", "Read as a date");

    _expectFill(dispatch, ONSET_COLUMN.id, {
      ...columnFill("onset_dt"),
      convert: { kind: "parse_date", format: "%m/%d/%Y" },
    });
  });

  it("multiplies with a preset factor", () => {
    const fill = {
      ...columnFill("age_mo"),
      convert: { kind: "multiply" as const, factor: 1 / 12 },
    };
    const dispatch = _render({ column: ONSET_COLUMN, fill });

    pickMantineSelectOption("Factor", "Years to months");

    _expectFill(dispatch, ONSET_COLUMN.id, {
      ...fill,
      convert: { kind: "multiply", factor: 12 },
    });
  });

  it("trims spaces and changes letter case", () => {
    const fill = {
      ...columnFill("CaseNo"),
      convert: {
        kind: "trim_and_fix_case" as const,
        letterCase: "keep" as const,
      },
    };
    const dispatch = _render({ fill });

    fireEvent.click(screen.getByRole("radio", { name: "UPPERCASE" }));

    _expectFill(dispatch, CASE_ID_COLUMN.id, {
      ...fill,
      convert: { kind: "trim_and_fix_case", letterCase: "upper" },
    });
  });

  it("translates a governed column with another code list holding labels", () => {
    const dispatch = _render({
      column: SEX_COLUMN,
      fill: GENDER_FILL,
      status: "suggested",
    });

    expect(
      screen.queryByRole("combobox", { name: "Change the values" }),
    ).toBeNull();
    pickMantineSelectOption("Translate values with", "Sex (M/F/U)");
    fireEvent.click(screen.getByRole("radio", { name: "Target values" }));

    _expectFill(dispatch, SEX_COLUMN.id, {
      ...GENDER_FILL,
      codeListId: SEX_LETTERS_LIST_ID,
    });
    _expectFill(dispatch, SEX_COLUMN.id, { ...GENDER_FILL, holdsLabels: true });
  });

  it("accepts or rejects a suggestion, naming the column", () => {
    const dispatch = _render({
      column: SEX_COLUMN,
      fill: GENDER_FILL,
      status: "suggested",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Accept the suggestion for sex" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Reject the suggestion for sex" }),
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: "suggestion_accepted",
      layoutId: QUEENS_LAYOUT_ID,
      columnId: SEX_COLUMN.id,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "suggestion_rejected",
      layoutId: QUEENS_LAYOUT_ID,
      columnId: SEX_COLUMN.id,
    });
  });

  it("shows what each example value becomes", () => {
    _render({ column: SEX_COLUMN, fill: GENDER_FILL });

    expect(screen.getByRole("table", { name: "Example" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "1 Male" })).toBeInTheDocument();
    expect(screen.getByText("Becomes empty")).toBeInTheDocument();
  });

  it("checks a Combine formula as it is typed, and inserts a column", async () => {
    const dispatch = _render({
      column: ONSET_COLUMN,
      fill: { kind: "expression", sql: "{first_name}" },
    });

    expect(
      screen.getByText("first_name isn't a column of this dataset."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Formula" }), {
      target: { value: "" },
    });
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Insert column" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "CaseNo", hidden: true }),
    );

    _expectFill(dispatch, ONSET_COLUMN.id, {
      kind: "expression",
      sql: "{CaseNo}",
    });
  });

  it("governs a column with a dictionary entry", () => {
    const dispatch = _render({ column: ONSET_COLUMN });

    pickMantineSelectOption("Dictionary entry", "sex");

    expect(dispatch).toHaveBeenCalledWith({
      type: "column_changed",
      columnId: ONSET_COLUMN.id,
      changes: { entryId: SEX_ENTRY_ID },
      context: CONTEXT,
    });
  });

  it("renames a column, refusing a name another column has", () => {
    const dispatch = _render({ column: ONSET_COLUMN });
    const nameInput = screen.getByRole("textbox", { name: "Name" });

    fireEvent.change(nameInput, { target: { value: "SEX " } });
    fireEvent.blur(nameInput);
    expect(
      screen.getByText("SEX is already a column of the combined dataset."),
    ).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.change(nameInput, { target: { value: "onset_date" } });
    fireEvent.blur(nameInput);

    expect(dispatch).toHaveBeenCalledWith({
      type: "column_changed",
      columnId: ONSET_COLUMN.id,
      changes: { name: "onset_date" },
      context: CONTEXT,
    });
  });

  it("removes a column", () => {
    const dispatch = _render({ column: ONSET_COLUMN });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove column rash_onset_date" }),
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: "column_removed",
      columnId: ONSET_COLUMN.id,
    });
  });
  it("reads the example from the layout's first dataset with the exact fill, column, and lookups", () => {
    _render({ column: SEX_COLUMN, fill: GENDER_FILL });

    expect(useFillExampleMock).toHaveBeenLastCalledWith({
      workspaceId: "workspace-1",
      datasetId: QUEENS_MARCH_ID,
      datasetName: "Queens 2026-03",
      fill: GENDER_FILL,
      column: SEX_COLUMN,
      codesOutputAs: "labels",
      columnNames: ["CaseNo", "GENDER", "onset_dt", "age_mo"],
      ...buildCodeListLookups(CONTEXT.entriesById),
    });
  });

  it("reads the example in the crosswalk's codes output mode", () => {
    _render({
      column: SEX_COLUMN,
      fill: GENDER_FILL,
      draft: makeDraft({ codesOutputAs: "codes" }),
    });

    expect(useFillExampleMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ codesOutputAs: "codes" }),
    );
  });

  it("pads with zeros to a chosen length", () => {
    const fill = {
      ...columnFill("CaseNo"),
      convert: { kind: "pad_text" as const, length: 5 },
    };
    const dispatch = _render({ fill });

    fireEvent.change(screen.getByRole("textbox", { name: "Length" }), {
      target: { value: "9" },
    });

    _expectFill(dispatch, CASE_ID_COLUMN.id, {
      ...fill,
      convert: { kind: "pad_text", length: 9 },
    });
  });

  it("does not pad to a length the combined dataset cannot hold", () => {
    const fill = {
      ...columnFill("CaseNo"),
      convert: { kind: "pad_text" as const, length: 5 },
    };
    const dispatch = _render({ fill });

    fireEvent.change(screen.getByRole("textbox", { name: "Length" }), {
      target: { value: "65" },
    });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("multiplies by a number of its own", () => {
    const fill = {
      ...columnFill("age_mo"),
      convert: { kind: "multiply" as const, factor: 3 },
    };
    const dispatch = _render({ column: ONSET_COLUMN, fill });

    fireEvent.change(screen.getByRole("textbox", { name: "Multiply by" }), {
      target: { value: "2.5" },
    });

    _expectFill(dispatch, ONSET_COLUMN.id, {
      ...fill,
      convert: { kind: "multiply", factor: 2.5 },
    });
  });

  it("reads a date in a format of its own, sent when the field is left or Enter is pressed", () => {
    const fill = {
      ...columnFill("onset_dt"),
      convert: { kind: "parse_date" as const, format: "%d.%m.%Y" },
    };
    const dispatch = _render({ column: ONSET_COLUMN, fill });
    const formatInput = screen.getByRole("textbox", { name: "Format" });

    fireEvent.change(formatInput, { target: { value: "%d-%m-%Y" } });
    fireEvent.change(formatInput, { target: { value: "%d-%m-%y" } });
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.blur(formatInput);
    expect(dispatch).toHaveBeenCalledTimes(1);
    _expectFill(dispatch, ONSET_COLUMN.id, {
      ...fill,
      convert: { kind: "parse_date", format: "%d-%m-%y" },
    });

    fireEvent.change(formatInput, { target: { value: "%d/%m/%Y" } });
    fireEvent.keyDown(formatInput, { key: "Enter" });
    expect(dispatch).toHaveBeenCalledTimes(2);
    _expectFill(dispatch, ONSET_COLUMN.id, {
      ...fill,
      convert: { kind: "parse_date", format: "%d/%m/%Y" },
    });
  });

  it("never sends a blank date format", () => {
    const fill = {
      ...columnFill("onset_dt"),
      convert: { kind: "parse_date" as const, format: "%d.%m.%Y" },
    };
    const dispatch = _render({ column: ONSET_COLUMN, fill });
    const formatInput = screen.getByRole("textbox", { name: "Format" });

    fireEvent.change(formatInput, { target: { value: "  " } });
    fireEvent.blur(formatInput);

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("can't remove the only column", () => {
    const dispatch = _render({
      draft: makeDraft({ columns: [CASE_ID_COLUMN] }),
    });
    const remove = screen.getByRole("button", {
      name: "Remove column case_id",
    });

    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("keeps showing the entry that governs a column even when it has no code list", () => {
    const entryId = SEX_ENTRY_ID;
    const noListEntry = { ...CONTEXT.entriesById.get(entryId)!, codeLists: [] };
    const dispatch = vi.fn();
    const draft = makeDraft();
    render(
      <MappingPane
        draft={draft}
        layout={draft.layouts.find((layout) => {
          return layout.id === QUEENS_LAYOUT_ID;
        })!}
        column={SEX_COLUMN}
        sourceColumns={DATASETS_BY_ID.get(QUEENS_MARCH_ID)!.columns}
        profilesBySourceColumn={QUEENS_PROFILES}
        dateFormatsBySourceColumn={QUEENS_DATE_FORMATS}
        context={{
          ...CONTEXT,
          entriesById: new Map([[entryId, noListEntry]]),
        }}
        dispatch={dispatch}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Dictionary entry" }),
    ).toHaveValue("sex");
  });
});
