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

  it("goes back to an earlier step", () => {
    const dispatch = vi.fn();
    render(
      <NewDictionaryStepper
        state={{ ...READ_STATE, step: "label" }}
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
