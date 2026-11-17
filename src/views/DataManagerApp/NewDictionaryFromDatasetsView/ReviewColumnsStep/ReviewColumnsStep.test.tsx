import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen, within } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { ReviewColumnsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep";
import { SuggestedTag } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/SuggestedTag";
import { ValuesSeenCell } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ValuesSeenCell";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  codes: readonly string[] | undefined,
  datasetId: Dataset.Id = BRONX_ID,
): ColumnProfile.T {
  return {
    datasetId,
    datasetName: datasetId === BRONX_ID ? "Bronx" : "Erie",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes?.length ?? 300,
    values: codes?.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

const BRONX_COLUMNS = [
  _column("GENDER", ["1", "2", "9"]),
  _column("hosp_yn", ["Y", "N"]),
  _column("ses_cat", ["1", "2", "3", "4"]),
  _column("case_id", undefined),
];

const TWO_DATASETS = DictionaryProposal.fromColumnProfiles([
  ...BRONX_COLUMNS,
  _column("sex", ["M", "F", "U"], ERIE_ID),
]);

function _renderStep(
  options: {
    proposal?: DictionaryProposal.T;
    originDatasetName?: string;
    meaningMatchStatus?: MeaningMatchStatus;
  } = {},
) {
  const dispatch = vi.fn();
  render(
    <ReviewColumnsStep
      proposal={options.proposal ?? TWO_DATASETS}
      originDatasetName={options.originDatasetName}
      meaningMatchStatus={options.meaningMatchStatus ?? "done"}
      dispatch={dispatch}
    />,
  );
  return { dispatch };
}

function _keyOf(proposal: DictionaryProposal.T, name: string): string {
  return (
    proposal.entries.find((entry) => {
      return entry.name === name;
    })?.key ?? ""
  );
}

describe("ReviewColumnsStep", () => {
  it("sorts entries into coded, ordered, and description-only sections", () => {
    _renderStep();
    expect(
      screen.getByRole("heading", { name: "Columns to map" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ordered scales" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Descriptions only" }),
    ).toBeInTheDocument();
    expect(screen.getByText("GENDER (Bronx), sex (Erie)")).toBeInTheDocument();
  });

  it("leaves an entry out when it is unchecked", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(screen.getByRole("checkbox", { name: "Include hosp_yn" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_entry_included",
      entryKey: _keyOf(TWO_DATASETS, "hosp_yn"),
      isIncluded: false,
    });
  });

  it("keeps the columns of a guessed merge apart on request", () => {
    const { dispatch } = _renderStep();
    expect(
      screen.getByText(
        "Same name, different values. Kept as separate code lists under one entry.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep apart: gender" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "keep_apart",
      entryKey: _keyOf(TWO_DATASETS, "gender"),
    });
  });

  it("describes why a guessed merge was made on its Keep apart button", () => {
    const matched = DictionaryProposal.applyMeaningMatches(
      DictionaryProposal.fromColumnProfiles([
        _column("hosp_yn", ["Y", "N"]),
        _column("admitted", ["0", "1"], ERIE_ID),
      ]),
      [{ name: "admitted", sameAs: "hosp_yn" }],
    );
    _renderStep({ proposal: matched });
    expect(
      screen.getByRole("button", { name: "Keep apart: hosp_yn" }),
    ).toHaveAccessibleDescription(
      "Matched by meaning, not just by name. Keep apart if these record different things.",
    );
  });

  it("names an entry after its most common column and renames it in place", () => {
    const { dispatch } = _renderStep();
    const nameInput = screen.getByRole("textbox", {
      name: "Name of the entry from GENDER",
    });
    expect(nameInput).toHaveValue("gender");
    fireEvent.change(nameInput, { target: { value: "sex_at_intake" } });
    expect(dispatch).toHaveBeenCalledWith({
      type: "rename_entry",
      entryKey: _keyOf(TWO_DATASETS, "gender"),
      name: "sex_at_intake",
    });
  });

  it("flags a name another entry has and holds Next until it is fixed", () => {
    const proposal = DictionaryProposal.renameEntry(TWO_DATASETS, {
      entryKey: _keyOf(TWO_DATASETS, "hosp_yn"),
      name: " Gender",
    });
    _renderStep({ proposal });
    expect(
      screen.getAllByText("Another entry already has this name."),
    ).toHaveLength(2);
    expect(
      screen.getByText("Fix the entry names marked above to go on."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next: map values" }),
    ).toBeDisabled();
  });

  it("says in each row whether the entry needs labels or a description", () => {
    _renderStep();
    const hospRow = screen.getByRole("row", { name: /hosp_yn/ });
    expect(within(hospRow).getByText("Needs mapping")).toBeInTheDocument();
    const idRow = screen.getByRole("row", { name: /case_id/ });
    expect(within(idRow).getByText("Description")).toBeInTheDocument();
  });

  it("holds Next and says why when every entry is left out", () => {
    const proposal = TWO_DATASETS.entries.reduce((current, entry) => {
      return DictionaryProposal.setEntryIncluded(current, {
        entryKey: entry.key,
        isIncluded: false,
      });
    }, TWO_DATASETS);
    _renderStep({ proposal });
    expect(
      screen.getByText("Include at least one entry to go on."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next: map values" }),
    ).toBeDisabled();
  });

  it("changes an entry's kind", () => {
    const { dispatch } = _renderStep();
    pickMantineSelectOption("Kind for hosp_yn", "Ordered");
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_entry_kind",
      entryKey: _keyOf(TWO_DATASETS, "hosp_yn"),
      kind: "ordered",
    });
  });

  it("says while it is looking for columns that mean the same thing", () => {
    _renderStep({ meaningMatchStatus: "finding" });
    expect(
      screen.getByText("Looking for columns that mean the same thing"),
    ).toBeInTheDocument();
  });

  it("offers to learn from more datasets when it started from one", () => {
    const { dispatch } = _renderStep({
      proposal: DictionaryProposal.fromColumnProfiles(BRONX_COLUMNS),
      originDatasetName: "Bronx",
    });
    expect(
      screen.getByText("4 columns in Bronx became 4 entries."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Learn from more datasets" }),
    );
    expect(dispatch).toHaveBeenCalledWith({ type: "learn_from_more" });
  });
});

describe("SuggestedTag", () => {
  it("gives its explanation to screen readers, not only to hover", () => {
    render(<SuggestedTag reason="meaning" explanationId="why" />);
    const badge = screen.getByText("Suggested").closest("[aria-describedby]");
    expect(badge).toHaveAccessibleDescription(
      "Matched by meaning, not just by name. Keep apart if these record different things.",
    );
    expect(badge).not.toHaveAttribute("tabindex");
  });
});

describe("ValuesSeenCell", () => {
  it("says how many more values there are beyond those spelled out", () => {
    const codes = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const [entry] = DictionaryProposal.fromColumnProfiles([
      _column("status", codes),
    ]).entries;
    render(
      <table>
        <tbody>
          <tr>
            <td>
              <ValuesSeenCell
                entry={entry as DictionaryProposal.Entry}
                sharedWithNames={[]}
              />
            </td>
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByText("a, b, c, d, e, f and 2 more")).toBeInTheDocument();
  });
});
