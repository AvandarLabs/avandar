import { describe, expect, it } from "vitest";
import { buildCodeListLookups } from "@/lib/crosswalks/buildCodeListLookups/buildCodeListLookups";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";

const MALE = {
  code: "1",
  label: "Male",
  acceptedSpellings: [],
  isMissing: false,
};
const LETTER_MALE = {
  code: "M",
  label: "Male",
  acceptedSpellings: [],
  isMissing: false,
};

function _entry(
  entryId: string,
  codeLists: DictionaryMatch.Entry["codeLists"],
): DictionaryMatch.Entry {
  return {
    dictionaryId: "dict-1" as DataDictionary.Id,
    dictionaryRank: 0,
    entryId: entryId as DataDictionaryEntry.Id,
    entryName: entryId,
    columnNames: [entryId],
    kind: "categorical",
    position: 0,
    codeLists,
  };
}

describe("buildCodeListLookups", () => {
  it("indexes every code list and names each entry's first list as its primary", () => {
    const entriesById = new Map([
      [
        "sex",
        _entry("sex", [
          {
            id: "list-codes" as DataDictionaryCodeList.Id,
            name: "1/2",
            pairs: [MALE],
          },
          {
            id: "list-letters" as DataDictionaryCodeList.Id,
            name: "M/F",
            pairs: [LETTER_MALE],
          },
        ]),
      ],
      ["notes", _entry("notes", [])],
    ]);

    const lookups = buildCodeListLookups(entriesById);

    expect([...lookups.codeListsById.keys()]).toEqual([
      "list-codes",
      "list-letters",
    ]);
    expect(lookups.codeListsById.get("list-letters")?.pairs).toEqual([
      LETTER_MALE,
    ]);
    expect([...lookups.primaryCodeListIdByEntryId]).toEqual([
      ["sex", "list-codes"],
    ]);
  });
});
