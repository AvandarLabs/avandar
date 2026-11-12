import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { CodeListValuesTable } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/CodeListValuesTable";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";

const CODE_LIST: DataDictionary.CodeListDraft = {
  id: "66666666-6666-4666-8666-666666666666" as DataDictionaryCodeList.Id,
  name: "Sex",
  isOrdered: false,
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
    { code: "9", label: "  ", acceptedSpellings: [], isMissing: false },
  ],
};

describe("CodeListValuesTable", () => {
  it("shows a dimmed placeholder for a value without a label", () => {
    render(<CodeListValuesTable codeList={CODE_LIST} />);
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getAllByText("No label yet")).toHaveLength(1);
  });
});
