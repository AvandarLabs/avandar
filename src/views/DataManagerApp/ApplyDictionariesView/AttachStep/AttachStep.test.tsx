import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  GENDER,
  makeApplyFlow,
  makeApplyLookups,
  SEX_LIST,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import { AttachStep } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

const { saveMock } = vi.hoisted(() => {
  return { saveMock: vi.fn() };
});

vi.mock("@/views/DataManagerApp/ApplyDictionariesView/useSaveApply", () => {
  return {
    useSaveApply: () => {
      return [saveMock, false];
    },
  };
});

const DATASET = { id: "dataset-1", name: "Kings line list" } as Dataset.T;
const REFERENCE_PICK: ColumnPick = { ...SEX_PICK, mode: "reference" };

function _render(
  picks: Record<string, ColumnPick>,
  existingBindings: readonly DictionaryBinding.T[] = [],
) {
  const flow = makeApplyFlow({
    unmatched: {
      status: "ready",
      result: new Map([
        [GENDER.id, [{ value: "8", valueKey: "8", rowCount: 2 }]],
      ]),
    },
  });
  render(
    <AttachStep
      dataset={DATASET}
      columns={[GENDER]}
      existingBindings={existingBindings}
      flow={{
        ...flow,
        state: {
          ...flow.state,
          step: "save",
          picks,
          resolutions: {
            [GENDER.id]: { "8": { action: "add", text: "Other" } },
          },
        },
      }}
      counts={{
        attachedCount: Object.keys(picks).length,
        describedCount: 0,
        usedDictionaryCount: 1,
      }}
      lookups={makeApplyLookups()}
      summary=""
      preview={null}
    />,
  );
}

describe("AttachStep", () => {
  beforeEach(() => {
    saveMock.mockClear();
  });

  it("attaches each pick as reference, with the values added to its list", () => {
    _render({ [GENDER.id]: REFERENCE_PICK });

    expect(
      screen.getByText(
        /Nothing in your data changes. 1 column keeps its values/,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Attach to Kings line list" }),
    );

    expect(saveMock).toHaveBeenCalledWith({
      kind: "attach",
      bindings: [
        {
          datasetColumnId: GENDER.id,
          dictionaryId: REFERENCE_PICK.dictionaryId,
          entryId: REFERENCE_PICK.entryId,
          codeListId: SEX_LIST.id,
          mode: "reference",
          direction: "decode",
          keepsOriginal: false,
          valueOverrides: [],
          isPinned: false,
        },
      ],
      addedPairs: [{ codeListId: SEX_LIST.id, code: "8", label: "Other" }],
    });
  });

  it("offers to remove the dictionaries when every pick was cleared", () => {
    _render({}, [{ datasetColumnId: GENDER.id } as DictionaryBinding.T]);

    const removeButton = screen.getByRole("button", {
      name: "Remove dictionaries from Kings line list",
    });
    expect(removeButton).toBeEnabled();
    fireEvent.click(removeButton);

    expect(saveMock).toHaveBeenCalledWith({
      kind: "attach",
      bindings: [],
      addedPairs: [],
    });
  });
});
