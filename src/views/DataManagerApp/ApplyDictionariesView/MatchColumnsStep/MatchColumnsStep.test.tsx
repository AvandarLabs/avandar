import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { makeInitialApplyState } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { MatchColumnsStep } from "@/views/DataManagerApp/ApplyDictionariesView/MatchColumnsStep/MatchColumnsStep";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ApplyFlow } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFlow";

const NYS = "dict-nys" as DataDictionary.Id;
const GENDER = {
  id: "col-gender" as DatasetColumn.Id,
  name: "GENDER",
  dataType: "bigint",
} as DatasetColumn.T;
const COUNTY = {
  id: "col-county" as DatasetColumn.Id,
  name: "county",
  dataType: "varchar",
} as DatasetColumn.T;
const SEX_MATCH: DictionaryMatch.T = {
  dictionaryId: NYS,
  dictionaryRank: 0,
  entryId: "entry-sex" as DataDictionaryEntry.Id,
  entryName: "sex",
  position: 0,
  codeListId: "list-sex" as DataDictionaryCodeList.Id,
  codeListName: "Sex (1/2/9)",
  coverage: 1,
  direction: "decode",
  fit: "fits",
  score: 1,
};

function _flow(dictionaryCount: number): ApplyFlow {
  const dictionaryIds = Array.from({ length: dictionaryCount }, (_, index) => {
    return (index === 0 ? NYS : `dict-${index}`) as DataDictionary.Id;
  });
  return {
    state: { ...makeInitialApplyState(), dictionaryIds },
    dispatch: vi.fn(),
    rows: [{ column: GENDER, profile: undefined, matches: [SEX_MATCH] }],
    unmatchedRows: [{ column: COUNTY, profile: undefined, matches: [] }],
    addDictionary: vi.fn(),
    isMatching: false,
    hasReadFailed: false,
  };
}

function _render(flow: ApplyFlow) {
  const dictionaries = (flow.state.dictionaryIds ?? []).map((id) => {
    return { id, name: id === NYS ? "NYS codes" : `Codes ${id}` };
  }) as DataDictionary.T[];
  render(
    <MatchColumnsStep
      flow={flow}
      dictionaries={dictionaries}
      lookups={{
        dictionaryNames: new Map(),
        entries: new Map(),
        codeLists: new Map(),
      }}
      summary="1 attached as reference"
    />,
  );
}

describe("MatchColumnsStep", () => {
  it("picks a dictionary's match for a column", () => {
    const flow = _flow(1);
    _render(flow);

    fireEvent.click(
      screen.getByRole("button", { name: /sex · Sex \(1\/2\/9\)/ }),
    );

    expect(flow.dispatch).toHaveBeenCalledWith({
      type: "toggle_pick",
      columnId: GENDER.id,
      pick: {
        dictionaryId: NYS,
        entryId: SEX_MATCH.entryId,
        codeListId: SEX_MATCH.codeListId,
        direction: "decode",
      },
    });
  });

  it("uses one Select per column past three dictionaries", () => {
    _render(_flow(4));

    expect(
      screen.getByRole("combobox", { name: "Entry to apply to GENDER" }),
    ).toBeInTheDocument();
  });

  it("says whether the columns with no match are shown", () => {
    _render(_flow(1));

    expect(
      screen.getByRole("button", { name: "Show 1 column with no match" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
