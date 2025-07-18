import { parseFileOrStringToCSV } from "@/components/DataManagerApp/hooks/useCSVParser";
import { createDexieCRUDClient } from "@/lib/clients/createDexieCRUDClient";
import { LocalDatasetParsers } from "./parsers";
import { LocalDataset, LocalDatasetId, ParsedLocalDataset } from "./types";

async function hydrateDataset(
  dataset: LocalDataset,
): Promise<ParsedLocalDataset> {
  const { csv } = await parseFileOrStringToCSV({
    dataToParse: dataset.data,
    firstRowIsHeader: true,
    delimiter: ",",
  });
  return { ...dataset, data: csv.data };
}

export const LocalDatasetClient = createDexieCRUDClient({
  modelName: "LocalDataset",
  primaryKey: "id",
  parsers: LocalDatasetParsers,
  mutations: ({ db }) => {
    return {
      deleteDatabase: async (): Promise<void> => {
        await db.delete();
      },
    };
  },
  queries: () => {
    return {
      getParsedLocalDataset: async (params: {
        id: LocalDatasetId;
      }): Promise<ParsedLocalDataset> => {
        const dataset = await LocalDatasetClient.getById({ id: params.id });
        if (!dataset) {
          throw new Error(`Dataset ${params.id} not found`);
        }

        return hydrateDataset(dataset);
      },

      hydrateDataset: async (params: {
        dataset: LocalDataset;
      }): Promise<ParsedLocalDataset> => {
        return hydrateDataset(params.dataset);
      },
    };
  },
});
