import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen } from "@/test-utils";
import {
  makeInitialNewDictionaryState,
  newDictionaryReducer,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import { NewDictionaryStepper } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepper/NewDictionaryStepper";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ProposalReadId } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";

const DATASET_ID = uuid<Dataset.Id>();

const READ_STATE = newDictionaryReducer(
  makeInitialNewDictionaryState(DATASET_ID),
  {
    type: "datasets_read",
    proposal: DictionaryProposal.fromColumnProfiles([]),
    datasetIds: [DATASET_ID],
    readId: uuid<ProposalReadId>(),
    defaultName: "Codes",
  },
);

const CODED_STATE = {
  ...READ_STATE,
  proposal: DictionaryProposal.fromColumnProfiles([
    {
      datasetId: DATASET_ID,
      datasetName: "Kings",
      columnName: "GENDER",
      dataType: "varchar",
      rowCount: 300,
      nonNullCount: 300,
      distinctCount: 3,
      values: ["1", "2", "9"].map((value) => {
        return { value, rowCount: 100 };
      }),
      dateShare: undefined,
      numberRange: undefined,
    },
  ]),
};

describe("NewDictionaryStepper", () => {
  it("has no Pick datasets step when the flow opened from a dataset", () => {
    render(
      <NewDictionaryStepper
        state={makeInitialNewDictionaryState(DATASET_ID)}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Pick datasets/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Review columns/ }),
    ).toBeInTheDocument();
  });

  it("has all four steps when the flow opened from the toolbar", () => {
    render(
      <NewDictionaryStepper
        state={makeInitialNewDictionaryState(undefined)}
        dispatch={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Pick datasets/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Map values/ }),
    ).toBeInTheDocument();
  });

  it("lists Map values and Describe columns before Save when there are values to map", () => {
    render(
      <NewDictionaryStepper
        state={{ ...CODED_STATE, step: "review" }}
        dispatch={vi.fn()}
      />,
    );
    expect(
      screen.getAllByRole("button").map((step) => {
        // Each step button leads with its number.
        return step.textContent?.replace(/^\d/, "");
      }),
    ).toEqual(["Review columns", "Map values", "Describe columns", "Save"]);
  });

  it("leaves out Map values but never Describe columns when nothing has values to map", () => {
    render(
      <NewDictionaryStepper
        state={{ ...READ_STATE, step: "review" }}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Map values/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Describe columns/ }),
    ).toBeInTheDocument();
  });

  it("goes back to an earlier step", () => {
    const dispatch = vi.fn();
    render(
      <NewDictionaryStepper
        state={{ ...CODED_STATE, step: "label" }}
        dispatch={dispatch}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Review columns/ }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "go_to_step",
      step: "review",
    });
  });

  it("does not jump ahead to a step that was not reached", () => {
    const dispatch = vi.fn();
    render(
      <NewDictionaryStepper
        state={{ ...READ_STATE, step: "review" }}
        dispatch={dispatch}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(dispatch).not.toHaveBeenCalled();
  });
});
