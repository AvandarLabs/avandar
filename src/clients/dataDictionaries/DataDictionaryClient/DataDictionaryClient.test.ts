import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return { from: vi.fn(), rpc: rpcMock };
      },
    },
  };
});

const { DataDictionaryClient } = await import("./DataDictionaryClient");

describe("DataDictionaryClient.saveContents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the contents to the save RPC in its stored shape and returns the new version", async () => {
    rpcMock.mockReturnValue({
      throwOnError: () => {
        return Promise.resolve({ data: 4 });
      },
    });
    const dictionaryId = uuid<DataDictionary.Id>();
    const codeListId = uuid<DataDictionaryCodeList.Id>();
    const entryId = uuid<DataDictionaryEntry.Id>();

    const version = await DataDictionaryClient.saveContents({
      dictionaryId,
      codeLists: [
        {
          id: codeListId,
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
        },
      ],
      entries: [
        {
          id: entryId,
          name: "sex",
          columnNames: ["GENDER"],
          kind: "categorical",
          unit: undefined,
          validMin: undefined,
          validMax: undefined,
          description: undefined,
          position: 0,
          codings: [{ codeListId, isPrimary: true }],
        },
      ],
    });

    expect(version).toBe(4);
    expect(rpcMock).toHaveBeenCalledWith("rpc_data_dictionaries__save", {
      p_dictionary_id: dictionaryId,
      p_code_lists: [
        {
          id: codeListId,
          name: "Sex",
          is_ordered: false,
          pairs: [
            {
              code: "1",
              label: "Male",
              accepted_spellings: ["M"],
              is_missing: false,
            },
          ],
        },
      ],
      p_entries: [
        {
          id: entryId,
          name: "sex",
          column_names: ["GENDER"],
          kind: "categorical",
          unit: null,
          valid_min: null,
          valid_max: null,
          description: null,
          position: 0,
          codings: [{ code_list_id: codeListId, is_primary: true }],
        },
      ],
    });
  });
});
