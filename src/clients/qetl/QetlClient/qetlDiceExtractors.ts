import {
  makeBucketRecord,
  makeIdLookupRecord,
  objectKeys,
  promiseFlatMap,
  prop,
  where,
} from "@avandar/utils";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { CsvFileDatasetClient } from "@/clients/datasets/source-datasets/CsvFileDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/source-datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { XlsxFileDatasetClient } from "@/clients/datasets/source-datasets/XlsxFileDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { difference } from "@/lib/utils/arrays/difference/difference";
import type {
  DatasetsById,
  DatasetsBySourceType,
  DiceExtractor,
} from "@/clients/qetl/QetlClient/QetlClient.types";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type SourceExtractorOptions = {
  ids: readonly Dataset.Id[];
  datasetsById: DatasetsById;
};

/** Returns the query's dependencies that are not already in the memory cube. */
export async function getMissingDice(
  queryDependencies: readonly Dataset.Id[],
): Promise<Dataset.Id[]> {
  if (queryDependencies.length === 0) {
    return [];
  }
  const inMemoryDice = await DuckDbClient.getTableOrViewNames();
  const inMemoryDiceSet = new Set(inMemoryDice);
  return difference(
    queryDependencies,
    queryDependencies.filter((datasetId) => {
      return inMemoryDiceSet.has(datasetId);
    }),
  );
}

async function _getCsvExtractors(
  options: Readonly<SourceExtractorOptions>,
): Promise<DiceExtractor[]> {
  const sources = await CsvFileDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "csv_file",
      sourceDataset,
    };
  });
}

async function _getXlsxExtractors(
  options: Readonly<SourceExtractorOptions>,
): Promise<DiceExtractor[]> {
  const sources = await XlsxFileDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "xlsx_file",
      sourceDataset,
    };
  });
}

async function _getVirtualExtractors(
  options: Readonly<SourceExtractorOptions>,
): Promise<DiceExtractor[]> {
  const sources = await VirtualDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "virtual",
      sourceDataset,
    };
  });
}

async function _getOpenDataExtractors(
  options: Readonly<SourceExtractorOptions>,
): Promise<DiceExtractor[]> {
  const sources = await OpenDataDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.ids));
  return sources.map((sourceDataset) => {
    return {
      dataset: options.datasetsById[sourceDataset.datasetId]!,
      sourceType: "open_data",
      sourceDataset,
    };
  });
}

async function _getExtractorsForSourceType(
  options: Readonly<{
    sourceType: Dataset.T["sourceType"];
    datasetsBySourceType: DatasetsBySourceType;
    datasetsById: DatasetsById;
  }>,
): Promise<DiceExtractor[]> {
  const extractorOptions = {
    ids: options.datasetsBySourceType[options.sourceType].map(prop("id")),
    datasetsById: options.datasetsById,
  };
  return match(options.sourceType)
    .with("csv_file", () => {
      return _getCsvExtractors(extractorOptions);
    })
    .with("xlsx_file", () => {
      return _getXlsxExtractors(extractorOptions);
    })
    .with("virtual", () => {
      return _getVirtualExtractors(extractorOptions);
    })
    .with("open_data", () => {
      return _getOpenDataExtractors(extractorOptions);
    })
    .with("google_sheets", () => {
      throw new Error("Google Sheets extraction is not supported yet");
    })
    .exhaustive();
}

/** Resolves each dice to the source record that says how to fetch it. */
export async function getDiceExtractors(
  dice: readonly Dataset.Id[],
): Promise<DiceExtractor[]> {
  const datasets = await DatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("id", "in", dice));
  const datasetsById = makeIdLookupRecord(datasets);
  const datasetsBySourceType = makeBucketRecord(datasets, {
    key: "sourceType",
  });
  return promiseFlatMap(objectKeys(datasetsBySourceType), (sourceType) => {
    return _getExtractorsForSourceType({
      sourceType,
      datasetsBySourceType,
      datasetsById,
    });
  });
}
