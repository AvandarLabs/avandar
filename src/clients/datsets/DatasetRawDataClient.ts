import { parseFileOrStringToCSV } from "@/components/DataManagerApp/hooks/useCSVParser";
import { AvaDexie } from "@/dexie/AvaDexie";
import { createDexieCRUDClient } from "@/lib/clients/dexie/createDexieCRUDClient";
import { RawDataRow } from "@/lib/types/common";
import { where } from "@/lib/utils/filters/filterBuilders";
import { DatasetId } from "@/models/datasets/Dataset";
import { DatasetRawDataParsers } from "@/models/datasets/DatasetRawData";

export const DatasetRawDataClient = createDexieCRUDClient({
  db: AvaDexie.DB,
  modelName: "DatasetRawData",
  parsers: DatasetRawDataParsers,
  queries: () => {
    return {
      /**
       * Retrieves the raw data for a dataset, parsed from a string into an
       * array of RawDataRow objects.
       *
       * @param params - The parameters for the operation
       * @param params.datasetId - The ID of the dataset whose raw data will be
       * retrieved.
       *
       * @returns The raw data for the dataset as an array of row objects
       */
      getParsedRawData: async (params: {
        datasetId: DatasetId;
      }): Promise<RawDataRow[]> => {
        const dataset = await DatasetRawDataClient.getOne(
          where("datasetId", "eq", params.datasetId),
        );
        if (!dataset) {
          throw new Error(`Dataset ${params.datasetId} not found`);
        }

        const { csv } = await parseFileOrStringToCSV({
          dataToParse: dataset.data,
          firstRowIsHeader: true,
          delimiter: ",",
        });
        return csv.data;
      },
    };
  },
});
