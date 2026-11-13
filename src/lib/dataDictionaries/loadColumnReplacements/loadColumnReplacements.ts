import { isDefined, makeBucketRecord, where } from "@avandar/utils";
import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import { DataDictionaryCodeListClient } from "@/clients/dataDictionaries/DataDictionaryCodeListClient";
import { DictionaryBindingClient } from "@/clients/dataDictionaries/DictionaryBindingClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import {
  getColumnReplacementsFromColumns,
  getProjectionKey,
} from "@/clients/qetl/QueryMediator/relationLoading/getColumnReplacementsFromColumns/getColumnReplacementsFromColumns";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { Logger } from "@/utils/Logger";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { LoadedColumnReplacements } from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { QueryKey } from "@tanstack/react-query";

const NO_CONVERSIONS: ReadonlyMap<string, ColumnConversion.T> = new Map();

/**
 * Reads fresh rows when the cached ones are invalidated or stale, and falls
 * back to the cached rows when that read fails, so a converted dataset keeps
 * converting through a dropped request.
 */
async function _fetchOrCached<Row>(
  options: Readonly<{ queryKey: QueryKey; fetch: () => Promise<Row[]> }>,
): Promise<Row[]> {
  try {
    return await options.fetch();
  } catch (error) {
    const cachedRows = AvaQueryClient.getQueryData<Row[]>(options.queryKey);
    if (cachedRows === undefined) {
      throw error;
    }
    return cachedRows;
  }
}

async function _readConvertBindings(
  datasetIds: readonly Dataset.Id[],
): Promise<DictionaryBinding.T[]> {
  const params = {
    where: { dataset_id: { in: [...datasetIds] }, mode: { eq: "convert" } },
  } as const;
  return await _fetchOrCached({
    queryKey: DictionaryBindingClient.QueryKeys.getAll(params),
    fetch: () => {
      return DictionaryBindingClient.withCache(AvaQueryClient)
        .withFetchQuery()
        .getAll(params);
    },
  });
}

/** The live code lists the unpinned bindings translate through. */
async function _readLiveCodeLists(
  bindings: readonly DictionaryBinding.T[],
): Promise<DataDictionaryCodeList.T[]> {
  const codeListIds = [
    ...new Set(
      bindings
        .filter((binding) => {
          return binding.pinnedPairs === undefined;
        })
        .map((binding) => {
          return binding.codeListId;
        })
        .filter(isDefined),
    ),
  ];
  if (codeListIds.length === 0) {
    return [];
  }
  const params = where("id", "in", codeListIds);
  return await _fetchOrCached({
    queryKey: DataDictionaryCodeListClient.QueryKeys.getAll(params),
    fetch: () => {
      return DataDictionaryCodeListClient.withCache(AvaQueryClient)
        .withFetchQuery()
        .getAll(params);
    },
  });
}

/**
 * Every convert binding's conversion among the datasets, by dataset column
 * id. A read that fails with nothing cached converts nothing and logs, so the
 * query still runs; the projection key then says "unconverted" and the first
 * successful read rebuilds the view.
 */
async function _readConversions(
  options: Readonly<{
    datasetIds: readonly Dataset.Id[];
    columns: readonly DatasetColumn.T[];
  }>,
): Promise<ReadonlyMap<string, ColumnConversion.T>> {
  try {
    const bindings = await _readConvertBindings(options.datasetIds);
    if (bindings.length === 0) {
      return NO_CONVERSIONS;
    }
    const codeLists = await _readLiveCodeLists(bindings);
    // Every column of the datasets, keep-original copies included: a
    // conversion finds its copy's name among them, and relation loading
    // narrows to the loaded subset only after the replacements are built.
    return ColumnConversion.fromRows({
      bindings,
      codeLists,
      columns: options.columns,
    });
  } catch (error) {
    Logger.error(
      "Could not read dictionary conversions; the datasets load unconverted",
      { error },
    );
    return NO_CONVERSIONS;
  }
}

/**
 * Each dataset's renames, casts, and conversions, and the projection key the
 * queryable tier checks its loaded view against, read from the dataset
 * catalog with the user's own permissions. Used by the query runner before
 * every workspace query that names a dataset.
 */
export async function loadColumnReplacements(
  datasetIds: readonly Dataset.Id[],
): Promise<LoadedColumnReplacements> {
  if (datasetIds.length === 0) {
    return { replacementsByDatasetId: {}, projectionKeyByDatasetId: {} };
  }
  const columns = await DatasetColumnClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", datasetIds));
  // Read whole, never narrowed to the columns a query needs, so each
  // conversion sees its keep-original copy.
  const conversions = await _readConversions({ datasetIds, columns });
  const columnsByDatasetId = makeBucketRecord(columns, { key: "datasetId" });
  const replacementsByDatasetId = Object.fromEntries(
    datasetIds.map((datasetId) => {
      return [
        datasetId,
        getColumnReplacementsFromColumns(
          columnsByDatasetId[datasetId] ?? [],
          conversions,
        ),
      ];
    }),
  );
  return {
    replacementsByDatasetId,
    projectionKeyByDatasetId: Object.fromEntries(
      Object.entries(replacementsByDatasetId).map(
        ([datasetId, replacements]) => {
          return [datasetId, getProjectionKey(replacements)];
        },
      ),
    ),
  };
}
