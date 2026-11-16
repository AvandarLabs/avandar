import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DictionaryEntriesTab } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

const LIST_ID =
  "33333333-3333-4333-8333-333333333333" as DataDictionaryCodeList.Id;
const SEX_ID = "44444444-4444-4444-8444-444444444444" as DataDictionaryEntry.Id;
const AGE_ID = "55555555-5555-4555-8555-555555555555" as DataDictionaryEntry.Id;

const DRAFT: DataDictionary.Draft = {
  codeLists: [
    {
      id: LIST_ID,
      name: "Sex (1/2/9)",
      isOrdered: false,
      pairs: [
        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      ],
    },
  ],
  entries: [
    {
      id: SEX_ID,
      name: "sex",
      columnNames: ["GENDER"],
      kind: "categorical",
      unit: "",
      validMin: undefined,
      validMax: undefined,
      description: "Sex recorded on the case report.",
      codings: [{ codeListId: LIST_ID, isPrimary: true }],
    },
    {
      id: AGE_ID,
      name: "age_years",
      columnNames: ["age"],
      kind: "number",
      unit: "years",
      validMin: 0,
      validMax: 120,
      description: "",
      codings: [],
    },
  ],
};

const UNLABELED_DRAFT: DataDictionary.Draft = {
  ...DRAFT,
  codeLists: DRAFT.codeLists.map((list) => {
    return {
      ...list,
      pairs: [
        ...list.pairs,
        { code: "9", label: "", acceptedSpellings: [], isMissing: true },
      ],
    };
  }),
};

function _renderTab(
  overrides: Partial<Parameters<typeof DictionaryEntriesTab>[0]> = {},
): void {
  render(
    <DictionaryEntriesTab
      draft={DRAFT}
      issues={[]}
      canEdit
      onDraftChange={vi.fn()}
      onOpenCodeList={vi.fn()}
      {...overrides}
    />,
  );
}

describe("DictionaryEntriesTab", () => {
  it("lists entries with their other column names and code list, and filters by either name", () => {
    _renderTab();
    expect(screen.getByRole("button", { name: "sex" })).toBeInTheDocument();
    expect(screen.getAllByText("Sex (1/2/9)").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Filter entries"), {
      target: { value: "age" },
    });
    expect(
      screen.queryByRole("button", { name: "sex" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "age_years" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter entries"), {
      target: { value: "gender" },
    });
    expect(screen.getByRole("button", { name: "sex" })).toBeInTheDocument();
  });

  it("says how many of an entry's values still need a label", () => {
    _renderTab({ draft: UNLABELED_DRAFT });
    expect(screen.getByText("1 value needs a label")).toBeInTheDocument();
  });

  it("edits the selected entry's description through the pane", () => {
    const onDraftChange = vi.fn();
    _renderTab({ onDraftChange });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Sex at birth." },
    });
    const nextDraft = onDraftChange.mock.calls[0]?.[0] as DataDictionary.Draft;
    expect(nextDraft.entries[0]?.description).toBe("Sex at birth.");
  });

  it("marks only the selected entry's row as current", () => {
    _renderTab();
    fireEvent.click(screen.getByRole("button", { name: "age_years" }));
    expect(screen.getByRole("button", { name: "age_years" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("button", { name: "sex" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("adds an entry", () => {
    const onDraftChange = vi.fn();
    _renderTab({ onDraftChange });
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    const nextDraft = onDraftChange.mock.calls[0]?.[0] as DataDictionary.Draft;
    expect(nextDraft.entries).toHaveLength(3);
    expect(nextDraft.entries[2]?.name).toBe("new_entry");
  });

  it("shows an issue beside the field it is about", () => {
    _renderTab({
      issues: [{ type: "entry_name_not_unique", entryId: SEX_ID }],
    });
    expect(
      screen.getByText("Another entry already has this name."),
    ).toBeInTheDocument();
  });
});
