import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DataDictionaryEntryCoding } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const WORKSPACE_ID = uuid<Workspace.Id>();
const DICTIONARY_ID = uuid<DataDictionary.Id>();
const NOW = "2026-11-11T10:00:00.000Z";

function _pair(code: string, label: string): DataDictionaryCodeList.Pair {
  return { code, label, acceptedSpellings: [], isMissing: false };
}

function _entryDraft(
  overrides: Partial<DataDictionary.EntryDraft> = {},
): DataDictionary.EntryDraft {
  return {
    id: uuid<DataDictionaryEntry.Id>(),
    name: "sex",
    columnNames: [],
    kind: "categorical",
    unit: "",
    validMin: undefined,
    validMax: undefined,
    description: "",
    codings: [],
    ...overrides,
  };
}

function _listDraft(
  overrides: Partial<DataDictionary.CodeListDraft> = {},
): DataDictionary.CodeListDraft {
  return {
    id: uuid<DataDictionaryCodeList.Id>(),
    name: "Sex (1/2)",
    isOrdered: false,
    pairs: [_pair("1", "Male"), _pair("2", "Female")],
    ...overrides,
  };
}

describe("DataDictionary.toDraft", () => {
  it("orders entries by position and puts each entry's primary coding first", () => {
    const listA = uuid<DataDictionaryCodeList.Id>();
    const listB = uuid<DataDictionaryCodeList.Id>();
    const sexId = uuid<DataDictionaryEntry.Id>();
    const entries: DataDictionaryEntry.T[] = [
      Model.make("DataDictionaryEntry", {
        id: uuid<DataDictionaryEntry.Id>(),
        workspaceId: WORKSPACE_ID,
        dictionaryId: DICTIONARY_ID,
        name: "age",
        columnNames: [],
        kind: "number",
        unit: "years",
        validMin: 0,
        validMax: 120,
        description: undefined,
        position: 1,
        createdAt: NOW,
        updatedAt: NOW,
      }),
      Model.make("DataDictionaryEntry", {
        id: sexId,
        workspaceId: WORKSPACE_ID,
        dictionaryId: DICTIONARY_ID,
        name: "sex",
        columnNames: ["GENDER"],
        kind: "categorical",
        unit: undefined,
        validMin: undefined,
        validMax: undefined,
        description: "Sex.",
        position: 0,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ];
    const codings: DataDictionaryEntryCoding.T[] = [
      Model.make("DataDictionaryEntryCoding", {
        id: uuid<DataDictionaryEntryCoding.Id>(),
        workspaceId: WORKSPACE_ID,
        dictionaryId: DICTIONARY_ID,
        entryId: sexId,
        codeListId: listB,
        isPrimary: false,
        createdAt: NOW,
        updatedAt: NOW,
      }),
      Model.make("DataDictionaryEntryCoding", {
        id: uuid<DataDictionaryEntryCoding.Id>(),
        workspaceId: WORKSPACE_ID,
        dictionaryId: DICTIONARY_ID,
        entryId: sexId,
        codeListId: listA,
        isPrimary: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ];

    const draft = DataDictionary.toDraft({ entries, codeLists: [], codings });

    expect(
      draft.entries.map((entry) => {
        return entry.name;
      }),
    ).toEqual(["sex", "age"]);
    expect(draft.entries[0]?.codings).toEqual([
      { codeListId: listA, isPrimary: true },
      { codeListId: listB, isPrimary: false },
    ]);
    expect(draft.entries[0]?.description).toBe("Sex.");
    expect(draft.entries[1]?.unit).toBe("years");
  });
});

describe("DataDictionary.toDraft coding tiebreak", () => {
  it("orders non-primary codings by code list id", () => {
    const entryId = uuid<DataDictionaryEntry.Id>();
    const listA =
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as DataDictionaryCodeList.Id;
    const listB =
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as DataDictionaryCodeList.Id;
    const entry: DataDictionaryEntry.T = Model.make("DataDictionaryEntry", {
      id: entryId,
      workspaceId: WORKSPACE_ID,
      dictionaryId: DICTIONARY_ID,
      name: "sex",
      columnNames: ["GENDER"],
      kind: "categorical",
      unit: undefined,
      validMin: undefined,
      validMax: undefined,
      description: undefined,
      position: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const codings = [listB, listA].map((codeListId) => {
      return Model.make("DataDictionaryEntryCoding", {
        id: uuid<DataDictionaryEntryCoding.Id>(),
        workspaceId: WORKSPACE_ID,
        dictionaryId: DICTIONARY_ID,
        entryId,
        codeListId,
        isPrimary: false,
        createdAt: NOW,
        updatedAt: NOW,
      });
    });

    const draft = DataDictionary.toDraft({
      entries: [entry],
      codeLists: [],
      codings,
    });

    expect(
      draft.entries[0]?.codings.map((coding) => {
        return coding.codeListId;
      }),
    ).toEqual([listA, listB]);
  });
});

describe("DataDictionary.findDraftIssues", () => {
  it("returns nothing for a valid draft", () => {
    const list = _listDraft();
    const draft = {
      codeLists: [list],
      entries: [
        _entryDraft({ codings: [{ codeListId: list.id, isPrimary: true }] }),
      ],
    };
    expect(DataDictionary.findDraftIssues(draft)).toEqual([]);
  });

  it("flags blank and duplicate entry names ignoring case and spaces", () => {
    const blank = _entryDraft({ name: "  " });
    const first = _entryDraft({ name: "sex" });
    const second = _entryDraft({ name: " SEX " });
    const issues = DataDictionary.findDraftIssues({
      codeLists: [],
      entries: [blank, first, second],
    });
    expect(issues).toEqual([
      { type: "entry_name_required", entryId: blank.id },
      { type: "entry_name_not_unique", entryId: first.id },
      { type: "entry_name_not_unique", entryId: second.id },
    ]);
  });

  it("flags a range whose lowest value is above its highest", () => {
    const age = _entryDraft({
      name: "age",
      kind: "number",
      validMin: 120,
      validMax: 0,
    });
    expect(
      DataDictionary.findDraftIssues({ codeLists: [], entries: [age] }),
    ).toEqual([{ type: "entry_range_invalid", entryId: age.id }]);
  });

  it("flags an incomplete pair, a repeated code, and a label reused as a spelling", () => {
    const list = _listDraft({
      pairs: [
        _pair("1", "Male"),
        _pair("1 ", "Man"),
        {
          code: "2",
          label: "Female",
          acceptedSpellings: ["male"],
          isMissing: false,
        },
        _pair("", "Unknown"),
      ],
    });
    expect(
      DataDictionary.findDraftIssues({ codeLists: [list], entries: [] }),
    ).toEqual([
      { type: "code_not_unique", codeListId: list.id, pairIndex: 0 },
      { type: "code_not_unique", codeListId: list.id, pairIndex: 1 },
      { type: "label_not_unique", codeListId: list.id, pairIndex: 2 },
      { type: "code_pair_incomplete", codeListId: list.id, pairIndex: 3 },
    ]);
  });
});

describe("DataDictionary.buildSavePayload", () => {
  it("trims text, numbers positions, and drops codings and number fields that do not apply", () => {
    const list = _listDraft({
      name: " Sex ",
      pairs: [
        {
          code: " 1 ",
          label: " Male ",
          acceptedSpellings: [" M ", "", "male", "M"],
          isMissing: false,
        },
      ],
    });
    const sex = _entryDraft({
      name: " sex ",
      columnNames: [" GENDER ", "", "gender"],
      unit: "years",
      validMin: 0,
      description: "  ",
      codings: [{ codeListId: list.id, isPrimary: true }],
    });
    const notes = _entryDraft({
      name: "notes",
      kind: "text",
      codings: [{ codeListId: list.id, isPrimary: true }],
    });

    const payload = DataDictionary.buildSavePayload({
      dictionaryId: DICTIONARY_ID,
      draft: { codeLists: [list], entries: [sex, notes] },
    });

    expect(payload.codeLists[0]).toEqual({
      id: list.id,
      name: "Sex",
      isOrdered: false,
      pairs: [
        {
          code: "1",
          label: "Male",
          acceptedSpellings: ["M"],
          isMissing: false,
        },
      ],
    });
    expect(payload.entries[0]).toEqual({
      id: sex.id,
      name: "sex",
      columnNames: ["GENDER"],
      kind: "categorical",
      unit: undefined,
      validMin: undefined,
      validMax: undefined,
      description: undefined,
      position: 0,
      codings: [{ codeListId: list.id, isPrimary: true }],
    });
    expect(payload.entries[1]?.codings).toEqual([]);
    expect(payload.entries[1]?.position).toBe(1);
  });
});

describe("DataDictionary.removeCodeList", () => {
  it("removes the list and every coding to it, promoting another coding to primary", () => {
    const listA = _listDraft({ name: "A" });
    const listB = _listDraft({ name: "B" });
    const sex = _entryDraft({
      codings: [
        { codeListId: listA.id, isPrimary: true },
        { codeListId: listB.id, isPrimary: false },
      ],
    });
    const draft = DataDictionary.removeCodeList(
      { codeLists: [listA, listB], entries: [sex] },
      listA.id,
    );
    expect(draft.codeLists).toEqual([listB]);
    expect(draft.entries[0]?.codings).toEqual([
      { codeListId: listB.id, isPrimary: true },
    ]);
  });
});

describe("DataDictionary.setPrimaryCodeList", () => {
  it("makes a list primary, keeps other codings, and clears all codings for none", () => {
    const listA = _listDraft({ name: "A" });
    const listB = _listDraft({ name: "B" });
    const sex = _entryDraft({
      codings: [{ codeListId: listA.id, isPrimary: true }],
    });
    const draft = { codeLists: [listA, listB], entries: [sex] };

    const withB = DataDictionary.setPrimaryCodeList(draft, {
      entryId: sex.id,
      codeListId: listB.id,
    });
    expect(withB.entries[0]?.codings).toEqual([
      { codeListId: listB.id, isPrimary: true },
      { codeListId: listA.id, isPrimary: false },
    ]);

    const cleared = DataDictionary.setPrimaryCodeList(withB, {
      entryId: sex.id,
      codeListId: undefined,
    });
    expect(cleared.entries[0]?.codings).toEqual([]);
  });
});

describe("DataDictionary.addCodeListForEntry", () => {
  it("adds an empty list named after the entry and makes it the entry's primary", () => {
    const sex = _entryDraft({ name: "sex" });
    const { draft, codeListId } = DataDictionary.addCodeListForEntry(
      { codeLists: [], entries: [sex] },
      sex.id,
    );
    expect(draft.codeLists).toHaveLength(1);
    expect(draft.codeLists[0]?.id).toBe(codeListId);
    expect(draft.codeLists[0]?.name).toBe("sex codes");
    expect(draft.entries[0]?.codings).toEqual([
      { codeListId, isPrimary: true },
    ]);
  });
});

describe("DataDictionary.parsePastedPairs", () => {
  it("reads one pair per line with =, :, a tab, or a comma, splitting at the first", () => {
    expect(
      DataDictionary.parsePastedPairs(
        "1 = Male\n2: Female\n\n3\tBlack, non-Hispanic\n9, Unknown\nno separator",
      ),
    ).toEqual([
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
      {
        code: "3",
        label: "Black, non-Hispanic",
        acceptedSpellings: [],
        isMissing: false,
      },
      { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: false },
      {
        code: "no separator",
        label: "",
        acceptedSpellings: [],
        isMissing: false,
      },
    ]);
  });
});

describe("DataDictionary.makeNewEntry and makeNewCodeList", () => {
  it("picks names that do not clash with existing ones", () => {
    expect(DataDictionary.makeNewEntry(["new_entry", "NEW_ENTRY_2"]).name).toBe(
      "new_entry_3",
    );
    expect(DataDictionary.makeNewCodeList(["New code list"]).name).toBe(
      "New code list 2",
    );
  });
});

describe("DataDictionary.toSaveErrorHint", () => {
  it("reads a known hint and ignores anything else", () => {
    expect(DataDictionary.toSaveErrorHint({ hint: "codes_not_unique" })).toBe(
      "codes_not_unique",
    );
    expect(
      DataDictionary.toSaveErrorHint({ hint: "something else" }),
    ).toBeUndefined();
    expect(DataDictionary.toSaveErrorHint(new Error("boom"))).toBeUndefined();
  });
});

describe("DataDictionary.setOtherCodeLists", () => {
  it("dedupes ids, keeps the primary first, and skips the primary's own id", () => {
    const listA = _listDraft({ name: "A" });
    const listB = _listDraft({ name: "B" });
    const listC = _listDraft({ name: "C" });
    const sex = _entryDraft({
      codings: [{ codeListId: listA.id, isPrimary: true }],
    });
    const draft = DataDictionary.setOtherCodeLists(
      { codeLists: [listA, listB, listC], entries: [sex] },
      {
        entryId: sex.id,
        codeListIds: [listB.id, listC.id, listB.id, listA.id],
      },
    );
    expect(draft.entries[0]?.codings).toEqual([
      { codeListId: listA.id, isPrimary: true },
      { codeListId: listB.id, isPrimary: false },
      { codeListId: listC.id, isPrimary: false },
    ]);
  });

  it("promotes the first coding when the entry has no primary", () => {
    const listA = _listDraft({ name: "A" });
    const listB = _listDraft({ name: "B" });
    const sex = _entryDraft({ codings: [] });
    const draft = DataDictionary.setOtherCodeLists(
      { codeLists: [listA, listB], entries: [sex] },
      { entryId: sex.id, codeListIds: [listA.id, listB.id] },
    );
    expect(draft.entries[0]?.codings).toEqual([
      { codeListId: listA.id, isPrimary: true },
      { codeListId: listB.id, isPrimary: false },
    ]);
  });
});

describe("DataDictionary.findDraftIssues (primary and list name)", () => {
  it("flags a coded entry with codings but no single primary", () => {
    const list = _listDraft();
    const sex = _entryDraft({
      codings: [{ codeListId: list.id, isPrimary: false }],
    });
    expect(
      DataDictionary.findDraftIssues({ codeLists: [list], entries: [sex] }),
    ).toEqual([{ type: "entry_primary_required", entryId: sex.id }]);
  });

  it("flags a code list with a blank name", () => {
    const list = _listDraft({ name: "   " });
    expect(
      DataDictionary.findDraftIssues({ codeLists: [list], entries: [] }),
    ).toEqual([{ type: "code_list_name_required", codeListId: list.id }]);
  });
});

describe("DataDictionary.toDraft ordering", () => {
  it("sorts code lists by name and non-primary codings by code list id", () => {
    const makeList = (name: string): DataDictionaryCodeList.T => {
      return Model.make("DataDictionaryCodeList", {
        id: uuid<DataDictionaryCodeList.Id>(),
        workspaceId: WORKSPACE_ID,
        dictionaryId: DICTIONARY_ID,
        name,
        isOrdered: false,
        pairs: [],
        createdAt: NOW,
        updatedAt: NOW,
      });
    };
    const entryId = uuid<DataDictionaryEntry.Id>();
    const makeCoding = (
      codeListId: DataDictionaryCodeList.Id,
    ): DataDictionaryEntryCoding.T => {
      return Model.make("DataDictionaryEntryCoding", {
        id: uuid<DataDictionaryEntryCoding.Id>(),
        workspaceId: WORKSPACE_ID,
        dictionaryId: DICTIONARY_ID,
        entryId,
        codeListId,
        isPrimary: false,
        createdAt: NOW,
        updatedAt: NOW,
      });
    };
    const zebra = makeList("Zebra");
    const apple = makeList("apple");
    const entry: DataDictionaryEntry.T = Model.make("DataDictionaryEntry", {
      id: entryId,
      workspaceId: WORKSPACE_ID,
      dictionaryId: DICTIONARY_ID,
      name: "sex",
      columnNames: [],
      kind: "categorical",
      unit: undefined,
      validMin: undefined,
      validMax: undefined,
      description: undefined,
      position: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const draft = DataDictionary.toDraft({
      entries: [entry],
      codeLists: [zebra, apple],
      codings: [makeCoding(zebra.id), makeCoding(apple.id)],
    });

    expect(
      draft.codeLists.map((list) => {
        return list.name;
      }),
    ).toEqual(["apple", "Zebra"]);
    const ids = (draft.entries[0]?.codings ?? []).map((coding) => {
      return coding.codeListId;
    });
    expect(ids).toEqual([zebra.id, apple.id].sort());
  });
});
