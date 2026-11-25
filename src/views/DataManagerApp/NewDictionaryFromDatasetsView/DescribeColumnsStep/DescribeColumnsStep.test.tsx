import { beforeAll, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen, within } from "@/test-utils";
import { DescribeColumnsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/DescribeColumnsStep/DescribeColumnsStep";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";

/**
 * Mantine hides a popover's dropdown when its target has no size, which is
 * always the case in jsdom, so its contents are found with `hidden: true`.
 */
const IN_POPOVER = { hidden: true } as const;

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

const DATASET_ID = uuid<Dataset.Id>();

function _codedColumn(
  columnName: string,
  codes: readonly string[],
): ColumnProfile.T {
  return {
    datasetId: DATASET_ID,
    datasetName: "Kings",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes.length,
    values: codes.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _textColumn(columnName: string): ColumnProfile.T {
  return {
    ..._codedColumn(columnName, []),
    distinctCount: 250,
    values: undefined,
  };
}

const BASE = DictionaryProposal.fromColumnProfiles([
  _codedColumn("GENDER", ["1", "2", "9"]),
  _textColumn("clinic_notes"),
  _textColumn("visit_summary"),
]);
const [GENDER_KEY = "", NOTES_KEY = "", SUMMARY_KEY = ""] = BASE.entries.map(
  (entry) => {
    return entry.key;
  },
);

function _typed(
  proposal: DictionaryProposal.T,
  entryKey: string,
  description: string,
): DictionaryProposal.T {
  return DictionaryProposal.setEntryDescription(proposal, {
    entryKey,
    description,
  });
}

type RenderOptions = {
  proposal?: DictionaryProposal.T;
  availability?: DictionarySuggestionAvailability;
  hasValuesToMap?: boolean;
  statusByEntryKey?: ReadonlyMap<string, "pending" | "failed">;
  isSuggesting?: boolean;
  progress?: { done: number; total: number };
};

function _renderStep(options: RenderOptions = {}) {
  const dispatch = vi.fn();
  const onSuggest = vi.fn();
  render(
    <DescribeColumnsStep
      proposal={options.proposal ?? BASE}
      suggestionAvailability={options.availability ?? "online"}
      hasValuesToMap={options.hasValuesToMap ?? true}
      statusByEntryKey={options.statusByEntryKey ?? new Map()}
      isSuggesting={options.isSuggesting ?? false}
      progress={options.progress}
      dispatch={dispatch}
      onSuggest={onSuggest}
    />,
  );
  return { dispatch, onSuggest };
}

describe("DescribeColumnsStep", () => {
  it("gives every included entry a description box, including ones with no value list", () => {
    _renderStep();
    expect(
      screen.getByRole("textbox", { name: "Description of gender" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Description of clinic_notes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Description of visit_summary" }),
    ).toBeInTheDocument();
  });

  it("leaves out an entry that was not included", () => {
    _renderStep({
      proposal: DictionaryProposal.setEntryIncluded(BASE, {
        entryKey: NOTES_KEY,
        isIncluded: false,
      }),
    });
    expect(
      screen.queryByRole("textbox", { name: "Description of clinic_notes" }),
    ).not.toBeInTheDocument();
  });

  it("shows where an entry's column came from, its kind, and what it holds", () => {
    _renderStep();
    const block = screen.getByRole("group", { name: "gender" });
    expect(within(block).getByText(/GENDER/)).toBeInTheDocument();
    expect(within(block).getByText(/Categorical/)).toBeInTheDocument();
    expect(within(block).getByText(/1, 2, 9/)).toBeInTheDocument();
  });

  it("types a description for an entry", () => {
    const { dispatch } = _renderStep();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Description of clinic_notes" }),
      { target: { value: "Free text from intake" } },
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_entry_description",
      entryKey: NOTES_KEY,
      description: "Free text from intake",
    });
  });

  it("says a suggested description is a suggestion on its own box", () => {
    const suggested = DictionaryProposal.suggestEntryDescription(BASE, {
      entryKey: NOTES_KEY,
      description: "Nurse notes.",
    });
    _renderStep({ proposal: suggested });
    expect(
      screen.getByRole("textbox", { name: "Description of clinic_notes" }),
    ).toHaveAccessibleDescription(
      "Suggested from the column. Edit it or keep it.",
    );
    expect(
      screen.getByRole("textbox", { name: "Description of visit_summary" }),
    ).not.toHaveAccessibleDescription();
  });

  describe("Suggest for one entry", () => {
    it("fills an empty box right away", () => {
      const { onSuggest } = _renderStep();
      fireEvent.click(
        screen.getByRole("button", {
          name: "Suggest a description for clinic_notes",
        }),
      );
      expect(onSuggest).toHaveBeenCalledWith({
        entryKeys: [NOTES_KEY],
        rewritableEntryKeys: [NOTES_KEY],
      });
    });

    it("asks first when the box has text, and says the suggestion may rewrite it", async () => {
      const { onSuggest } = _renderStep({
        proposal: _typed(BASE, NOTES_KEY, "Free text the nurse wrote"),
      });
      fireEvent.click(
        screen.getByRole("button", {
          name: "Suggest a description for clinic_notes",
        }),
      );
      expect(onSuggest).not.toHaveBeenCalled();
      expect(
        await screen.findByText(
          "The suggestion uses what you wrote and may rewrite it.",
        ),
      ).toBeInTheDocument();
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Suggest and rewrite",
          ...IN_POPOVER,
        }),
      );
      expect(onSuggest).toHaveBeenCalledWith({
        entryKeys: [NOTES_KEY],
        rewritableEntryKeys: [NOTES_KEY],
      });
    });

    it("sends nothing when the user cancels the note", async () => {
      const { onSuggest } = _renderStep({
        proposal: _typed(BASE, NOTES_KEY, "Free text the nurse wrote"),
      });
      fireEvent.click(
        screen.getByRole("button", {
          name: "Suggest a description for clinic_notes",
        }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Cancel", ...IN_POPOVER }),
      );
      expect(onSuggest).not.toHaveBeenCalled();
    });

    it("does not ask before replacing an earlier suggestion", () => {
      const suggested = DictionaryProposal.suggestEntryDescription(BASE, {
        entryKey: NOTES_KEY,
        description: "Nurse notes.",
      });
      const { onSuggest } = _renderStep({ proposal: suggested });
      fireEvent.click(
        screen.getByRole("button", {
          name: "Suggest a description for clinic_notes",
        }),
      );
      expect(onSuggest).toHaveBeenCalledTimes(1);
    });
  });

  describe("Suggest all", () => {
    it("runs right away on every included entry when none has a description", () => {
      const { onSuggest } = _renderStep();
      fireEvent.click(screen.getByRole("button", { name: "Suggest all" }));
      expect(onSuggest).toHaveBeenCalledWith({
        entryKeys: [GENDER_KEY, NOTES_KEY, SUMMARY_KEY],
        rewritableEntryKeys: [],
      });
    });

    it("lists the entries that have a description, checked, before it rewrites any", async () => {
      const { onSuggest } = _renderStep({
        proposal: _typed(
          _typed(BASE, GENDER_KEY, "Sex at birth"),
          NOTES_KEY,
          "Free text",
        ),
      });
      fireEvent.click(screen.getByRole("button", { name: "Suggest all" }));
      expect(onSuggest).not.toHaveBeenCalled();
      const gender = await screen.findByRole("checkbox", {
        name: "gender",
        ...IN_POPOVER,
      });
      const notes = screen.getByRole("checkbox", {
        name: "clinic_notes",
        ...IN_POPOVER,
      });
      expect(gender).toBeChecked();
      expect(notes).toBeChecked();
      expect(
        screen.queryByRole("checkbox", { name: "visit_summary" }),
      ).not.toBeInTheDocument();
    });

    it("leaves out of the run an entry the user unchecks, and always fills empty ones", async () => {
      const { onSuggest } = _renderStep({
        proposal: _typed(
          _typed(BASE, GENDER_KEY, "Sex at birth"),
          NOTES_KEY,
          "Free text",
        ),
      });
      fireEvent.click(screen.getByRole("button", { name: "Suggest all" }));
      fireEvent.click(
        await screen.findByRole("checkbox", { name: "gender", ...IN_POPOVER }),
      );
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Suggest and rewrite",
          ...IN_POPOVER,
        }),
      );
      expect(onSuggest).toHaveBeenCalledWith({
        entryKeys: [NOTES_KEY, SUMMARY_KEY],
        rewritableEntryKeys: [NOTES_KEY],
      });
    });

    it("runs on only the empty entries when every written one is unchecked", async () => {
      const { onSuggest } = _renderStep({
        proposal: _typed(BASE, GENDER_KEY, "Sex at birth"),
      });
      fireEvent.click(screen.getByRole("button", { name: "Suggest all" }));
      fireEvent.click(
        await screen.findByRole("checkbox", { name: "gender", ...IN_POPOVER }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "Suggest", ...IN_POPOVER }),
      );
      expect(onSuggest).toHaveBeenCalledWith({
        entryKeys: [NOTES_KEY, SUMMARY_KEY],
        rewritableEntryKeys: [],
      });
    });
  });

  describe("while suggestions run or fail", () => {
    it("shows the entry being suggested as busy and holds every Suggest button", () => {
      _renderStep({
        statusByEntryKey: new Map([[NOTES_KEY, "pending"]]),
        isSuggesting: true,
      });
      const busy = screen.getByRole("button", {
        name: "Suggest a description for clinic_notes",
      });
      expect(busy).toHaveAttribute("data-loading", "true");
      expect(
        screen.getByRole("button", {
          name: "Suggest a description for gender",
        }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Suggest all" }),
      ).toBeDisabled();
    });

    it("says how far a run of several entries has got", () => {
      _renderStep({
        isSuggesting: true,
        progress: { done: 12, total: 50 },
      });
      expect(screen.getByText("Suggested 12 of 50")).toBeInTheDocument();
    });

    it("says on the entry that its suggestion did not come back", () => {
      _renderStep({ statusByEntryKey: new Map([[NOTES_KEY, "failed"]]) });
      const block = screen.getByRole("group", { name: "clinic_notes" });
      expect(
        within(block).getByText(
          "The suggestion did not come back. Try again or write it yourself.",
        ),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole("group", { name: "gender" })).queryByText(
          /did not come back/,
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe("when suggestions cannot run", () => {
    it.each(["unavailable", "declined"] as const)(
      "turns every Suggest button off and says why when %s",
      (availability) => {
        _renderStep({ availability });
        expect(
          screen.getByRole("button", { name: "Suggest all" }),
        ).toBeDisabled();
        expect(
          screen.getByRole("button", {
            name: "Suggest a description for gender",
          }),
        ).toBeDisabled();
        expect(
          screen.getByText(/You can still write the descriptions yourself/),
        ).toBeInTheDocument();
      },
    );

    it("still lets the user type a description", () => {
      const { dispatch } = _renderStep({ availability: "unavailable" });
      fireEvent.change(
        screen.getByRole("textbox", { name: "Description of gender" }),
        { target: { value: "Sex" } },
      );
      expect(dispatch).toHaveBeenCalled();
    });
  });

  describe("with many entries", () => {
    it("lists all 60 and counts them", () => {
      const columns = Array.from({ length: 60 }, (_item, index) => {
        return _textColumn(`column_${index}`);
      });
      _renderStep({ proposal: DictionaryProposal.fromColumnProfiles(columns) });
      expect(screen.getAllByRole("textbox")).toHaveLength(60);
      expect(screen.getByText("60 entries")).toBeInTheDocument();
    });
  });

  describe("with nothing included", () => {
    const NONE = DictionaryProposal.fromColumnProfiles([]);

    it("says there is nothing to describe", () => {
      _renderStep({ proposal: NONE });
      expect(screen.getByText("Nothing to describe")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("goes back to Review, where entries are included, and holds Next", () => {
      const { dispatch } = _renderStep({
        proposal: NONE,
        hasValuesToMap: false,
      });
      expect(screen.getByRole("button", { name: "Next: save" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(dispatch).toHaveBeenCalledWith({
        type: "go_to_step",
        step: "review",
      });
    });
  });

  describe("footer", () => {
    it("goes back to Map values when there are values to map", () => {
      const { dispatch } = _renderStep({ hasValuesToMap: true });
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(dispatch).toHaveBeenCalledWith({
        type: "go_to_step",
        step: "label",
      });
    });

    it("goes back to Review when Map values was skipped", () => {
      const { dispatch } = _renderStep({ hasValuesToMap: false });
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(dispatch).toHaveBeenCalledWith({
        type: "go_to_step",
        step: "review",
      });
    });

    it("goes on to Save", () => {
      const { dispatch } = _renderStep();
      fireEvent.click(screen.getByRole("button", { name: "Next: save" }));
      expect(dispatch).toHaveBeenCalledWith({
        type: "go_to_step",
        step: "save",
      });
    });
  });
});
