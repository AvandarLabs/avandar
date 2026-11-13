import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { makeInitialApplyState } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { AttachStep } from "@/views/DataManagerApp/ApplyDictionariesView/AttachStep/AttachStep";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";

const { attachMock } = vi.hoisted(() => {
  return { attachMock: vi.fn() };
});

vi.mock(
  "@/views/DataManagerApp/ApplyDictionariesView/useAttachDictionaries",
  () => {
    return {
      useAttachDictionaries: () => {
        return [attachMock, false];
      },
    };
  },
);

const DATASET = { id: "dataset-1", name: "Kings line list" } as Dataset.T;
const GENDER = { id: "col-gender", name: "GENDER" } as DatasetColumn.T;
const PICK: ColumnPick = {
  dictionaryId: "dict-1" as DataDictionary.Id,
  entryId: "entry-sex" as DataDictionaryEntry.Id,
  codeListId: "list-sex" as DataDictionaryCodeList.Id,
  direction: "decode",
};

function _render(
  picks: Record<string, ColumnPick>,
  existingBindings: readonly DictionaryBinding.T[] = [],
) {
  const flow: ApplyFlow = {
    state: {
      ...makeInitialApplyState(),
      dictionaryIds: [],
      step: "attach",
      picks,
    },
    dispatch: vi.fn(),
    rows: [],
    unmatchedRows: [],
    addDictionary: vi.fn(),
    isMatching: false,
    hasReadFailed: false,
  };
  render(
    <AttachStep
      dataset={DATASET}
      columns={[GENDER]}
      existingBindings={existingBindings}
      flow={flow}
      counts={{
        attachedCount: Object.keys(picks).length,
        describedCount: 0,
        usedDictionaryCount: 1,
      }}
      lookups={{
        dictionaryNames: new Map(),
        entries: new Map(),
        codeLists: new Map(),
      }}
      summary=""
    />,
  );
}

describe("AttachStep", () => {
  beforeEach(() => {
    attachMock.mockClear();
  });

  it("attaches each pick as reference", () => {
    _render({ [GENDER.id]: PICK });

    expect(
      screen.getByText(
        /Nothing in your data changes. 1 column keeps its values/,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Attach to Kings line list" }),
    );

    expect(attachMock).toHaveBeenCalledWith([
      { datasetColumnId: GENDER.id, ...PICK, mode: "reference" },
    ]);
  });

  it("offers to remove the dictionaries when every pick was cleared", () => {
    _render({}, [{ datasetColumnId: GENDER.id } as DictionaryBinding.T]);

    const removeButton = screen.getByRole("button", {
      name: "Remove dictionaries from Kings line list",
    });
    expect(removeButton).toBeEnabled();
    fireEvent.click(removeButton);

    expect(attachMock).toHaveBeenCalledWith([]);
  });
});
