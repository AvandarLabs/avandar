import { beforeAll, describe, expect, it, vi } from "vitest";
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

vi.mock(
  "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/useFillExample/useFillExample")
      >();
    return {
      ...original,
      useFillExample: () => {
        return {
          status: "ready",
          result: [
            { before: "1", after: "Male" },
            { before: "7", after: undefined },
          ],
        };
      },
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
    pickMantineSelectOption("Translate codes with", "Sex (M/F/U)");
    fireEvent.click(screen.getByRole("radio", { name: "Labels" }));

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
});
