import { beforeAll, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen } from "@/test-utils";
import { SaveStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

const DATASET_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  codes: readonly string[] | undefined,
): ColumnProfile.T {
  return {
    datasetId: DATASET_ID,
    datasetName: "Kings line list",
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

const PROPOSAL = DictionaryProposal.fromColumnProfiles([
  _column("GENDER", ["1", "2", "9"]),
  _column("case_id", undefined),
]);
const LABELS = DictionaryProposal.withDefaultLabels(
  {},
  DictionaryProposal.getCodings(PROPOSAL).codeLists,
);

function _renderStep(
  options: { name?: string; originDatasetName?: string } = {},
) {
  const dispatch = vi.fn();
  const onCreate = vi.fn();
  render(
    <SaveStep
      proposal={PROPOSAL}
      labels={LABELS}
      name={options.name ?? "Kings codes"}
      description=""
      originDatasetName={options.originDatasetName}
      learnedFromNames={["Kings line list"]}
      isCreating={false}
      dispatch={dispatch}
      onCreate={onCreate}
    />,
  );
  return { dispatch, onCreate };
}

describe("SaveStep", () => {
  it("sums up what will be saved", () => {
    _renderStep();
    expect(screen.getByRole("row", { name: "Entries 2" })).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "Code lists 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "Values labeled 0 of 3" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "Learned from Kings line list" }),
    ).toBeInTheDocument();
  });

  it("warns about unlabeled values but still creates the dictionary", () => {
    const { onCreate } = _renderStep();
    expect(
      screen.getByText(
        "3 values in gender (1/2/9) have no label yet. They are saved without one and marked as needing a label, so you can finish them on the dictionary.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create dictionary" }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Create dictionary" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("cannot create a dictionary without a name", () => {
    _renderStep({ name: " " });
    expect(
      screen.getByRole("button", { name: "Create dictionary" }),
    ).toBeDisabled();
  });

  it("renames the dictionary as it is typed", () => {
    const { dispatch } = _renderStep();
    fireEvent.change(screen.getByRole("textbox", { name: "Dictionary name" }), {
      target: { value: "Borough codes" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_name",
      name: "Borough codes",
    });
  });

  it("says a dictionary learned from one dataset is not tied to it", () => {
    _renderStep({ originDatasetName: "Kings line list" });
    expect(
      screen.getByText(/Kings line list is only where it started/),
    ).toBeInTheDocument();
  });
});
