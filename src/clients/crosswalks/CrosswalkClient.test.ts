import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

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

const { CrosswalkClient } = await import("./CrosswalkClient");

const CROSSWALK_ID = uuid<Crosswalk.Id>();
const LAYOUT_ID = uuid<CrosswalkLayout.Id>();
const SEX_COLUMN_ID = uuid<CrosswalkColumn.Id>();
const COUNTY_COLUMN_ID = uuid<CrosswalkColumn.Id>();
const DATASET_ID = uuid<Dataset.Id>();
const ENTRY_ID = uuid<DataDictionaryEntry.Id>();
const CODE_LIST_ID = uuid<DataDictionaryCodeList.Id>();
const SEX_MAPPING_ID = uuid<CrosswalkMapping.Id>();
const COUNTY_MAPPING_ID = uuid<CrosswalkMapping.Id>();

function _resolveWith(data: unknown): void {
  rpcMock.mockReturnValue({
    throwOnError: () => {
      return Promise.resolve({ data });
    },
  });
}

const SAVE_PAYLOAD: Crosswalk.SavePayload = {
  crosswalkId: CROSSWALK_ID,
  settings: {
    name: "Measles line lists",
    description: undefined,
    codesOutputAs: "labels",
    addsSourceColumn: true,
  },
  columns: [
    {
      id: SEX_COLUMN_ID,
      name: "sex",
      position: 0,
      dataType: "varchar",
      entryId: ENTRY_ID,
    },
    {
      id: COUNTY_COLUMN_ID,
      name: "county",
      position: 1,
      dataType: "varchar",
      entryId: undefined,
    },
  ],
  layouts: [
    {
      id: LAYOUT_ID,
      signature: "l1.0123456789abcdef",
      columnNames: ["GENDER", "county"],
      isReference: true,
      status: "mapped",
    },
  ],
  datasets: [{ datasetId: DATASET_ID, layoutId: LAYOUT_ID }],
  mappings: [
    {
      id: SEX_MAPPING_ID,
      layoutId: LAYOUT_ID,
      columnId: SEX_COLUMN_ID,
      fill: {
        kind: "column",
        sourceColumn: "GENDER",
        convert: undefined,
        codeListId: CODE_LIST_ID,
        holdsLabels: false,
      },
      status: "confirmed",
      confidence: 0.94,
      reason: "name_and_type",
    },
    {
      id: COUNTY_MAPPING_ID,
      layoutId: LAYOUT_ID,
      columnId: COUNTY_COLUMN_ID,
      fill: { kind: "constant", value: "Bronx" },
      status: "suggested",
      confidence: undefined,
      reason: undefined,
    },
  ],
};

describe("CrosswalkClient.saveContents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the whole crosswalk to the save RPC in its stored shape", async () => {
    _resolveWith(null);

    await CrosswalkClient.saveContents(SAVE_PAYLOAD);

    expect(rpcMock).toHaveBeenCalledWith("rpc_crosswalks__save", {
      p_crosswalk_id: CROSSWALK_ID,
      p_settings: {
        name: "Measles line lists",
        description: null,
        codes_output_as: "labels",
        adds_source_column: true,
      },
      p_columns: [
        {
          id: SEX_COLUMN_ID,
          name: "sex",
          position: 0,
          data_type: "varchar",
          entry_id: ENTRY_ID,
        },
        {
          id: COUNTY_COLUMN_ID,
          name: "county",
          position: 1,
          data_type: "varchar",
          entry_id: null,
        },
      ],
      p_layouts: [
        {
          id: LAYOUT_ID,
          signature: "l1.0123456789abcdef",
          column_names: ["GENDER", "county"],
          is_reference: true,
          status: "mapped",
        },
      ],
      p_datasets: [{ dataset_id: DATASET_ID, layout_id: LAYOUT_ID }],
      p_mappings: [
        {
          id: SEX_MAPPING_ID,
          layout_id: LAYOUT_ID,
          column_id: SEX_COLUMN_ID,
          fill: {
            version: 1,
            kind: "column",
            source_column: "GENDER",
            convert: null,
            code_list_id: CODE_LIST_ID,
            holds_labels: false,
          },
          status: "confirmed",
          confidence: 0.94,
          reason: "name_and_type",
        },
        {
          id: COUNTY_MAPPING_ID,
          layout_id: LAYOUT_ID,
          column_id: COUNTY_COLUMN_ID,
          fill: { version: 1, kind: "constant", value: "Bronx" },
          status: "suggested",
          confidence: null,
          reason: null,
        },
      ],
    });
  });
});

describe("CrosswalkClient.saveCombinedDataset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the compiled dataset to the combine RPC and returns its id", async () => {
    const datasetId = uuid<Dataset.Id>();
    const dictionaryId = uuid<DataDictionary.Id>();
    _resolveWith(datasetId);

    const savedId = await CrosswalkClient.saveCombinedDataset({
      crosswalkId: CROSSWALK_ID,
      datasetId,
      datasetName: "Measles line lists (combined)",
      rawSql: 'SELECT 1 AS "x"',
      columns: [
        { name: "source_dataset", dataType: "varchar" },
        { name: "sex", dataType: "varchar" },
      ],
      bindings: [
        {
          columnName: "sex",
          dictionaryId,
          entryId: ENTRY_ID,
          codeListId: CODE_LIST_ID,
          direction: "encode",
        },
      ],
      compiledCodeLists: [{ codeListId: CODE_LIST_ID, fingerprint: "p1.abc" }],
    });

    expect(savedId).toBe(datasetId);
    expect(rpcMock).toHaveBeenCalledWith(
      "rpc_crosswalks__save_combined_dataset",
      {
        p_crosswalk_id: CROSSWALK_ID,
        p_dataset_id: datasetId,
        p_dataset_name: "Measles line lists (combined)",
        p_raw_sql: 'SELECT 1 AS "x"',
        p_columns: [
          { name: "source_dataset", data_type: "varchar" },
          { name: "sex", data_type: "varchar" },
        ],
        p_bindings: [
          {
            column_name: "sex",
            dictionary_id: dictionaryId,
            entry_id: ENTRY_ID,
            code_list_id: CODE_LIST_ID,
            direction: "encode",
          },
        ],
        p_compiled_code_lists: [
          { code_list_id: CODE_LIST_ID, fingerprint: "p1.abc" },
        ],
      },
    );
  });
});
