import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { ReviewColumnsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep";
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
      screen.getByRole("heading", { name: "Coded columns" }),
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
        "Same name, different codes. Kept as separate code lists under one entry.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Keep the columns in gender apart" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "keep_apart",
      entryKey: _keyOf(TWO_DATASETS, "gender"),
    });
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
      screen.getByRole("button", { name: "Next: label values" }),
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
