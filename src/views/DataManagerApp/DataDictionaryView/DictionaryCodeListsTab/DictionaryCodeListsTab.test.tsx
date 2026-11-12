import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DictionaryCodeListsTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryCodeListsTab/DictionaryCodeListsTab";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

const SEX_ID =
  "77777777-7777-4777-8777-777777777777" as DataDictionaryCodeList.Id;
const RACE_ID =
  "88888888-8888-4888-8888-888888888888" as DataDictionaryCodeList.Id;

const DRAFT: DataDictionary.Draft = {
  entries: [],
  codeLists: [
    { id: SEX_ID, name: "Sex", isOrdered: false, pairs: [] },
    { id: RACE_ID, name: "Race", isOrdered: false, pairs: [] },
  ],
};

describe("DictionaryCodeListsTab", () => {
  it("lists the code lists and selects one", () => {
    const onSelectCodeList = vi.fn();
    render(
      <DictionaryCodeListsTab
        draft={DRAFT}
        issues={[]}
        canEdit
        selectedCodeListId={SEX_ID}
        onSelectCodeList={onSelectCodeList}
        onDraftChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Race"));
    expect(onSelectCodeList).toHaveBeenCalledWith(RACE_ID);
  });

  it("adds a code list and selects it", () => {
    const onDraftChange = vi.fn();
    const onSelectCodeList = vi.fn();
    render(
      <DictionaryCodeListsTab
        draft={DRAFT}
        issues={[]}
        canEdit
        selectedCodeListId={SEX_ID}
        onSelectCodeList={onSelectCodeList}
        onDraftChange={onDraftChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "New code list" }));
    const nextDraft = onDraftChange.mock.calls[0]?.[0] as DataDictionary.Draft;
    expect(nextDraft.codeLists).toHaveLength(3);
    expect(onSelectCodeList).toHaveBeenCalledWith(nextDraft.codeLists[2]?.id);
  });

  it("explains an empty dictionary", () => {
    render(
      <DictionaryCodeListsTab
        draft={{ entries: [], codeLists: [] }}
        issues={[]}
        canEdit
        selectedCodeListId={undefined}
        onSelectCodeList={vi.fn()}
        onDraftChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/No code lists yet/)).toBeInTheDocument();
  });
});
