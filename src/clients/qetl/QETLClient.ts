import { createModuleFactory } from "@modules/createModuleFactory";
import { where } from "@utils/filters/where/where";
import { isDefined } from "@utils/guards/isDefined/isDefined";
import { objectKeys, propEq, UnknownObject } from "@utils/index";
import { prop } from "@utils/objects/hofs/prop/prop";
import { makeBucketRecord } from "@utils/objects/makeBucketRecord/makeBucketRecord";
import { makeIdLookupRecord } from "@utils/objects/makeIdLookupRecord/makeIdLookupRecord";
import { CSVFileDataset } from "$/models/datasets/CSVFileDataset";
import { Dataset, DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import { DuckDBDataType } from "$/models/datasets/DatasetColumn/DuckDBDataTypes";
import { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset.types";
import { match } from "ts-pattern";
import { OpenDataCatalogEntryClient } from "@/clients/catalog-entries/OpenDataCatalogEntryClient";
import { CSVFileDatasetClient } from "@/clients/datasets/CSVFileDatasetClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { OpenDataDatasetClient } from "@/clients/datasets/OpenDataDatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/VirtualDatasetClient";
import { DuckDBClient, UnknownRow } from "@/clients/DuckDBClient";
import { DuckDBLoadParquetResult } from "@/clients/DuckDBClient/DuckDBClient.types";
import { DuckDBDataTypeUtils } from "@/clients/DuckDBClient/DuckDBDataType";
import { DatasetParquetStorageClient } from "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { difference } from "@/lib/utils/arrays/difference/difference";
import { promiseFlatMap, promiseMap } from "@/lib/utils/promises";
import type { Module } from "@modules/createModule";
import type { OpenDataDataset } from "$/models/datasets/OpenDataDataset/OpenDataDataset.types";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.types";

export type IQETLClient = Module<
  "QETLClient",
  {
    /** Get the necessary dice to answer the given SQL query. */
    getDiceFromSQL: (rawSQL: string) => Promise<readonly DatasetId[]>;

    /** Insert the given facts into the local storage cache. */
    insertToStorageCache: (params: {
      facts: Array<{ datasetId: DatasetId; parquetBlob: Blob }>;
    }) => Promise<void>;
  },
  {
    /**
     * Runs an OLAP query.
     */
    runQuery: <RowObject extends UnknownRow = UnknownRow>(params: {
      rawSQL: string;
    }) => Promise<QueryResult<RowObject>>;
  }
>;

type ColumnReplacement = {
  /** The original name of the column from the source data. */
  originalName: string;
  /** The new name of the column. */
  alias?: string;
  /** The new data type of the column. */
  dataType?: DuckDBDataType;
};

type DiceExtractor =
  | {
      sourceType: "csv_file";
      sourceDataset: CSVFileDataset;
      dataset: Dataset;
    }
  | {
      sourceType: "virtual";
      sourceDataset: VirtualDataset.T;
      dataset: Dataset;
    }
  | {
      sourceType: "google_sheets";
      dataset: Dataset;
      sourceDataset: GoogleSheetsDataset;
    }
  | {
      sourceType: "open_data";
      dataset: Dataset;
      sourceDataset: OpenDataDataset;
    };

/**
 * This is the powerhouse of Avandar. It powers our QETL architecture for
 * on-demand ETL queries.
 *
 * Based heavily on Baldacci et. al. (2017)
 * "QETL: An approach to on-demand ETL from non-owned data sources."
 *
 * In this implementation, the data cube is a two-layer storage system: there
 * is a local in-memory cube (a DuckDB database) from which data is ultimately
 * queried to generate the output data. We will refer to this as the MemoryCube.
 * There is a layer above this with more local storage capacity, which we will
 * refer to as the "storage cube." IndexedDB is used as the storage cube.
 * The storage cube is not used for querying, but as an on-disk cache to
 * easily load data into the Memory Cube and reduce the number of network
 * requests that must be done.
 *
 * Future work will allow this to be abstracted to any database, so that
 * SQLite WASM can be used for transactional QETL.
 *
 * TODO(jpsyx): this is **far** from a real QETL implementation. Currently
 * it only operates on full datasets rather than doing any filtering of data,
 * dice management, fact loading, or any other optimizations.
 */
export const QETLClientFactory = createModuleFactory<IQETLClient>(
  "QETLClient",
  {
    childBuilder(module) {
      const { getDiceFromSQL, insertToStorageCache } = module.getState();

      // The Memory Cube is an in-memory DuckDB instance.
      const MemoryCube = {
        getAllDice: async (): Promise<readonly string[]> => {
          const inMemoryDice = await DuckDBClient.getTableOrViewNames();
          return inMemoryDice;
        },

        dropDice: async ({
          datasetId,
        }: {
          datasetId: DatasetId;
        }): Promise<void> => {
          return DuckDBClient.dropTableViewAndFile(datasetId);
        },

        /**
         * Loads data into the MemoryCube.
         * No other side effects - this does not handle any fetching or other
         * data management operations. Just straight up loads a parquet blob
         * into the memory cube.
         * @param datasetId The id of the dataset to load.
         * @param parquetBlob The parquet blob to load.
         * @param columnReplacements An optional record of column replacements
         *   to adjust the schema when loading the data into memory.
         * @returns
         */
        loadData: async ({
          datasetId,
          parquetBlob,
          columnReplacements,
        }: {
          datasetId: DatasetId;
          parquetBlob: Blob;
          columnReplacements?: readonly ColumnReplacement[];
        }): Promise<DuckDBLoadParquetResult> => {
          return DuckDBClient.loadParquet({
            tableName: datasetId,
            blob: parquetBlob,
            columnReplacements:
              columnReplacements ?
                makeIdLookupRecord(columnReplacements, {
                  key: "originalName",
                })
              : undefined,
          });
        },
      };

      const DiceManager = {
        determineMissingDice: async ({
          rawSQL,
        }: {
          rawSQL: string;
        }): Promise<{ missingDice: DatasetId[] }> => {
          const queryDependencies = await getDiceFromSQL(rawSQL);

          if (queryDependencies.length === 0) {
            // there are no dependencies, so there is nothing to load
            return { missingDice: [] };
          }

          // check which dependencies are in the MemoryCube
          // TODO(jpsyx): This is an insufficient check. It is possible the
          //   dataset in the memory cube is outdated. This can be the case for
          //   live connections to external data sources. We need to figure out
          //   if the dataset is outdated by checking some dirty flag or
          //   last modified timestamp.
          const allDatasetsInMemoryCube = await MemoryCube.getAllDice();
          const depsInMemoryCube = queryDependencies.filter((datasetId) => {
            return allDatasetsInMemoryCube.includes(datasetId);
          });
          const depsNotInMemory = difference(
            queryDependencies,
            depsInMemoryCube,
          );
          return { missingDice: depsNotInMemory };
        },
      };

      const OptimizationEngine = {
        /**
         * For all given dice, we build the necessary queries to fetch them.
         *
         * TODO(jpsyx): for now, we are not building any optimized queries. We
         * are simply fetching the entire datasets. This will necessarily change
         * once we have to start querying 3rd party data sources, where it is
         * simply not an option to fetch the entire dataset. We want to
         * construct queries or API calls specific to what we need.
         *
         * @param dice The dice to determine the optimal extractions for.
         * @returns The extractors for the given dice. For now, since
         * each dice is just a dataset id. We return the full dataset object as
         * the extraction instructions.
         */
        determineExtractions: async ({
          dice,
        }: {
          dice: readonly DatasetId[];
        }): Promise<{
          diceExtractors: DiceExtractor[];
        }> => {
          const datasets = await DatasetClient.withCache(AvaQueryClient)
            .withEnsureQueryData()
            .getAll(where("id", "in", dice));
          const datasetsById = makeIdLookupRecord(datasets);
          const datasetsBySourceType = makeBucketRecord(datasets, {
            key: "sourceType",
          });

          const diceExtractors = await promiseFlatMap(
            objectKeys(datasetsBySourceType),
            async (sourceType) => {
              const extractors: DiceExtractor[] = await match(sourceType)
                .with("csv_file", async (type) => {
                  const ids = datasetsBySourceType[type].map(prop("id"));
                  const csvDatasets = await CSVFileDatasetClient.withCache(
                    AvaQueryClient,
                  )
                    .withEnsureQueryData()
                    .getAll(where("dataset_id", "in", ids));
                  return csvDatasets.map((csvDataset) => {
                    return {
                      dataset: datasetsById[csvDataset.datasetId]!,
                      sourceType: "csv_file",
                      sourceDataset: csvDataset,
                    } as const;
                  });
                })
                .with("virtual", async (type) => {
                  const ids = datasetsBySourceType[type].map(prop("id"));
                  const virtualDatasets = await VirtualDatasetClient.withCache(
                    AvaQueryClient,
                  )
                    .withEnsureQueryData()
                    .getAll(where("dataset_id", "in", ids));
                  return virtualDatasets.map((virtualDataset) => {
                    return {
                      dataset: datasetsById[virtualDataset.datasetId]!,
                      sourceType: "virtual",
                      sourceDataset: virtualDataset,
                    } as const;
                  });
                })
                .with("google_sheets", async () => {
                  throw new Error(
                    "Google Sheets extraction is not supported yet",
                  );
                })
                .with("open_data", async (type) => {
                  const ids = datasetsBySourceType[type].map(prop("id"));
                  const openDataDatasets =
                    await OpenDataDatasetClient.withCache(AvaQueryClient)
                      .withEnsureQueryData()
                      .getAll(where("dataset_id", "in", ids));
                  return openDataDatasets.map((openDataDataset) => {
                    return {
                      dataset: datasetsById[openDataDataset.datasetId]!,
                      sourceType: "open_data" as const,
                      sourceDataset: openDataDataset,
                    } as const;
                  });
                })
                .exhaustive();
              return extractors;
            },
          );

          return { diceExtractors };
        },
      };

      const ETLService = {
        prepareFacts: ({
          data,
        }: {
          data: Array<{ datasetId: DatasetId; parquetBlob: Blob }>;
        }): Promise<Array<{ datasetId: DatasetId; parquetBlob: Blob }>> => {
          // TODO(jpsyx): identity function for now but this should be replaced
          // with a real implementation of Baldacci et. al. (2017).
          return Promise.resolve(data);
        },
        fetchData: async ({
          extractors,
        }: {
          extractors: readonly DiceExtractor[];
        }): Promise<Array<{ datasetId: DatasetId; parquetBlob: Blob }>> => {
          const blobs = await promiseMap(extractors, async (extractor) => {
            // first check if the dataset is in the local storage cache
            const localDataset = await LocalDatasetClient.getById({
              id: extractor.dataset.id,
            });

            // if we have a cache hit, then return the parquet blob, no need
            // to download from cloud storage
            if (localDataset) {
              return {
                datasetId: extractor.dataset.id,
                parquetBlob: localDataset.parquetData,
              };
            }

            return match(extractor)
              .with({ sourceType: "csv_file" }, async (ex) => {
                const parquetBlob =
                  await DatasetParquetStorageClient.downloadDataset({
                    datasetId: ex.dataset.id,
                    workspaceId: ex.dataset.workspaceId,
                  });

                if (!parquetBlob) {
                  throw new Error(
                    `Failed to download data for CSV file dataset '${ex.dataset.id}' (${ex.dataset.name})`,
                  );
                }
                return { datasetId: ex.dataset.id, parquetBlob };
              })
              .with({ sourceType: "virtual" }, async (ex) => {
                // virtual datasets result in a recursive QETL call, where we
                // evaluate the virtual dataset's raw SQL query in order to
                // materialize it into a parquet blob.
                // This blob is a dice we can use to answer the original query.
                const evaluatedBlob = await runQuery({
                  rawSQL: ex.sourceDataset.rawSQL,
                  returnType: "parquet",
                });

                return {
                  datasetId: ex.dataset.id,
                  parquetBlob: evaluatedBlob,
                };
              })
              .with({ sourceType: "google_sheets" }, () => {
                throw new Error(
                  "Google Sheets data fetching is not supported yet",
                );
              })
              .with({ sourceType: "open_data" }, async (ex) => {
                const catalogEntry = await OpenDataCatalogEntryClient.getOne(
                  where("id", "eq", ex.sourceDataset.catalogEntryId),
                );
                if (!catalogEntry) {
                  throw new Error(
                    `Missing catalog entry for open data dataset ` +
                      `'${ex.dataset.id}' (${ex.dataset.name})`,
                  );
                }
                const parquetUrl = catalogEntry.canonicalUrls?.find((url) => {
                  return url.toLowerCase().endsWith(".parquet");
                });
                if (!parquetUrl) {
                  throw new Error(
                    `No Parquet URL in catalog for dataset '${ex.dataset.name}'`,
                  );
                }
                const response = await fetch(parquetUrl);
                if (!response.ok) {
                  throw new Error(
                    `Open data Parquet download failed: ${response.statusText}`,
                  );
                }
                const parquetBlob = await response.blob();
                return { datasetId: ex.dataset.id, parquetBlob };
              })
              .exhaustive(() => {
                throw new Error(
                  `Invalid extractor type to fetch data: ${extractor.sourceType}`,
                );
              });
          });
          return blobs;
        },
      };

      const FilteringEngine = {
        loadFacts: async ({
          facts,
        }: {
          facts: Array<{ datasetId: DatasetId; parquetBlob: Blob }>;
        }): Promise<void> => {
          // first, we figure out which facts are not in our local storage
          // cache, so we can store them
          const factsInLocalStorage = await LocalDatasetClient.withCache(
            AvaQueryClient,
          )
            .withEnsureQueryData()
            .getAll(where("datasetId", "in", facts.map(prop("datasetId"))));
          const factsToCache = facts.filter((fact) => {
            return !factsInLocalStorage.some(
              propEq("datasetId", fact.datasetId),
            );
          });

          // add new facts to the local storage cache
          await insertToStorageCache({
            facts: factsToCache,
          });

          const columns = await DatasetColumnClient.withCache(AvaQueryClient)
            .withEnsureQueryData()
            .getAll(where("dataset_id", "in", facts.map(prop("datasetId"))));

          const columnsByDatasetId = makeBucketRecord(columns, {
            key: "datasetId",
          });

          // iterate through each fact and load it into the MemoryCube. We know
          // for a fact they are not in the MemoryCube otherwise they would not
          // have been sent to the FilteringEngine.
          await promiseMap(facts, ({ datasetId, parquetBlob }) => {
            const cols = columnsByDatasetId[datasetId] ?? [];
            const schemaChanges = cols
              .map((col) => {
                const changedName = col.name !== col.originalName;
                const changedDataType =
                  col.dataType !==
                  DuckDBDataTypeUtils.toAvaDataType(col.detectedDataType);
                if (changedName || changedDataType) {
                  return {
                    originalName: col.originalName,
                    alias: changedName ? col.name : undefined,
                    dataType:
                      changedDataType ?
                        DuckDBDataTypeUtils.fromDatasetColumnType(col.dataType)
                      : undefined,
                  };
                }
                return undefined;
              })
              .filter(isDefined);

            return MemoryCube.loadData({
              datasetId,
              parquetBlob,
              columnReplacements: schemaChanges,
            });
          });
        },
      };

      async function runQuery(options: {
        rawSQL: string;
        returnType: "parquet";
      }): Promise<Blob>;
      async function runQuery<
        RowObject extends UnknownObject = UnknownRow,
      >(options: {
        rawSQL: string;
        returnType?: "js";
      }): Promise<QueryResult<RowObject>>;
      async function runQuery<RowObject extends UnknownObject = UnknownRow>({
        rawSQL,
        returnType = "js",
      }: {
        rawSQL: string;
        returnType?: "parquet" | "js";
      }): Promise<Blob | QueryResult<RowObject>> {
        // From Baldacci et. al. (2017) p.6:
        // 1. Dice management determines the set of missing dice and transmits
        //    them to optimization and filtering.
        // 2. Optimization determines a set of optimal extractions and calls the
        //    ETL service accordingly.
        // 3. ETL sends a fetching query to the source data provider.
        // 4. The source data provider returns the required data.
        // 5. ETL puts the data in multidimensional form and sends the resulting
        //    facts to filtering.
        //    If there is not enough room in the cube:
        //    5.1. Dice management chooses the dice to be dropped from the cube.
        // 6. Filtering loads the filtered facts into the cube.

        // For our purposes, the "cube" will be two-layered: the local DuckDB
        // database for in-memory querying, and IndexedDB for local storage.

        // For now, our dice management will be naive. We will not actually use
        // any ranges, intervals, or dice. We will simply use the dataset IDs as
        // the dice. This is far from optimized and will need to be changed
        // packaging this as its own library.

        // 1. Determine the set of missing dice
        // First, we inspect the query to determine which datasets are needed
        // TODO(jpsyx): In a real QETL implementation, we would use a more
        //   sophisticated algorithm to determine the 'facts' and 'dice' that
        //   are needed to answer the query. For now, we will just take all
        //   dataset ids and see which are in memory and local storage. We are
        //   not using anything more sophisticated for v0.
        const { missingDice } = await DiceManager.determineMissingDice({
          rawSQL,
        });

        // 2. Optimization engine determines set of optimal extractions
        const { diceExtractors: extractors } =
          await OptimizationEngine.determineExtractions({
            dice: missingDice,
          });

        // 3. Call the ETL service to fetch the data, which will in turn
        //   send a fetching query to the appropriate source data providers.
        const fetchedData = await ETLService.fetchData({
          extractors,
        });

        // 4. ETL puts the data in multidimensional form and sends the resulting
        //    facts to filtering.
        //    TODO(jpsyx): For now, this is just an identity function that
        //    returns the data. It is a noop with no side-effects, we are not
        //    doing any of what Baldacci et. al. (2017) describes for this step.
        //    We will implement this when we have a real QETL implementation
        //    with proper data cubes and dice management.
        //    Also, is this even necessary for non-OLAP queries? Perhaps we can
        //    have a flag in this client for OLAP and non-OLAP (transactional)
        //    queries.
        const preparedData = await ETLService.prepareFacts({
          data: fetchedData,
        });

        // 5. Dice management chooses the dice to be dropped from the cube (and
        //    from local storage cache), before we load new data.
        //    TODO(jpsyx): also not implementing this for now, but it's a
        //    crucial bit of performance optimization that we need to implement.
        //    We should decide based on memory and storage usage in the browser.
        //    The MemoryCube and StorageCubes have to both be managed. The
        //    MemoryCube will require more swapping.

        // 6. Filtering loads the filtered facts into the MemoryCube
        await FilteringEngine.loadFacts({
          facts: preparedData,
        });

        // now run the actual query against the memory cube, because we can be
        // confident that all the data is in the memory cube.
        if (returnType === "js") {
          return await DuckDBClient.runRawQuery<RowObject>(rawSQL);
        } else {
          return await DuckDBClient.runRawQuery(rawSQL, {
            returnType: "parquet",
          });
        }
      }

      return { runQuery };
    },
  },
);
