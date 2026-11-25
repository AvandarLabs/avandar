import { describe, expect, it } from "vitest";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { isCrosswalkStale } from "@/lib/crosswalks/isCrosswalkStale/isCrosswalkStale";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";

const LIST_ID = "list-sex" as DataDictionaryCodeList.Id;

const PAIRS: DataDictionaryCodeList.Pair[] = [
  { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
];

const COMPILED = [
  {
    codeListId: LIST_ID,
    fingerprint: CrosswalkSql.getCodeListFingerprint(PAIRS),
  },
];

describe("isCrosswalkStale", () => {
  it("is fresh while every list holds the pairs it was combined with", () => {
    expect(
      isCrosswalkStale({
        compiledCodeLists: COMPILED,
        codeLists: [{ id: LIST_ID, pairs: PAIRS }],
      }),
    ).toBe(false);
  });

  it("is stale once a label in an embedded list changed", () => {
    const relabeled = [PAIRS[0]!, { ...PAIRS[1]!, label: "Woman" }];

    expect(
      isCrosswalkStale({
        compiledCodeLists: COMPILED,
        codeLists: [{ id: LIST_ID, pairs: relabeled }],
      }),
    ).toBe(true);
  });

  it("is stale once an embedded list is gone", () => {
    expect(
      isCrosswalkStale({ compiledCodeLists: COMPILED, codeLists: [] }),
    ).toBe(true);
  });

  it("is fresh when the combined dataset embedded no list", () => {
    expect(isCrosswalkStale({ compiledCodeLists: [], codeLists: [] })).toBe(
      false,
    );
  });

  it("is stale once the primary list a second coding was reconciled to changed", () => {
    // A fill that translates with M/F/U outputs the primary list's labels, so
    // the combine records both lists.
    const mfuId = "list-sex-mfu" as DataDictionaryCodeList.Id;
    const mfuPairs: DataDictionaryCodeList.Pair[] = [
      { code: "M", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "F", label: "Female", acceptedSpellings: [], isMissing: false },
    ];
    const compiledCodeLists = [
      ...COMPILED,
      {
        codeListId: mfuId,
        fingerprint: CrosswalkSql.getCodeListFingerprint(mfuPairs),
      },
    ];
    const relabeledPrimary = [PAIRS[0]!, { ...PAIRS[1]!, label: "Woman" }];

    expect(
      isCrosswalkStale({
        compiledCodeLists,
        codeLists: [
          { id: LIST_ID, pairs: relabeledPrimary },
          { id: mfuId, pairs: mfuPairs },
        ],
      }),
    ).toBe(true);
  });
});
