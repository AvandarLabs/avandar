import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql";
import { useCrosswalkStaleness } from "@/hooks/crosswalks/useCrosswalkStaleness/useCrosswalkStaleness";
import { renderHook } from "@/test-utils";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";

const mocks = vi.hoisted(() => {
  return {
    codeLists: undefined as unknown[] | undefined,
    options: undefined as unknown,
  };
});

vi.mock("@/clients/dataDictionaries/DataDictionaryCodeListClient", () => {
  return {
    DataDictionaryCodeListClient: {
      useGetAll: (options: unknown) => {
        mocks.options = options;
        return [mocks.codeLists, false];
      },
    },
  };
});

const LIST_ID = "list-sex" as DataDictionaryCodeList.Id;
const PAIRS: DataDictionaryCodeList.Pair[] = [
  { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
];

const CROSSWALK = {
  id: "crosswalk-1",
  name: "Borough line lists",
  compiledCodeLists: [
    {
      codeListId: LIST_ID,
      fingerprint: CrosswalkSql.getCodeListFingerprint(PAIRS),
    },
  ],
} as unknown as Crosswalk.T;

function _render(crosswalk: Crosswalk.T | undefined) {
  return renderHook(() => {
    return useCrosswalkStaleness(crosswalk);
  }).result.current;
}

describe("useCrosswalkStaleness", () => {
  beforeEach(() => {
    mocks.codeLists = [{ id: LIST_ID, pairs: PAIRS }];
    mocks.options = undefined;
  });

  it("reads the embedded lists and finds them unchanged", () => {
    expect(_render(CROSSWALK)).toEqual({ isStale: false, isLoading: false });
    expect(mocks.options).toMatchObject({
      where: { id: { in: [LIST_ID] } },
      useQueryOptions: { enabled: true },
    });
  });

  it("is stale once an embedded list's label changed", () => {
    mocks.codeLists = [
      { id: LIST_ID, pairs: [{ ...PAIRS[0]!, label: "Man" }] },
    ];

    expect(_render(CROSSWALK).isStale).toBe(true);
  });

  it("calls nothing stale while the lists could not be read", () => {
    mocks.codeLists = undefined;

    expect(_render(CROSSWALK).isStale).toBe(false);
  });

  it("reads nothing without a crosswalk", () => {
    expect(_render(undefined).isStale).toBe(false);
    expect(mocks.options).toMatchObject({
      useQueryOptions: { enabled: false },
    });
  });
});
