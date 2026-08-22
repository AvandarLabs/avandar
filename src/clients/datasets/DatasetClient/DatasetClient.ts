import type { DatasetClientCrud } from "@/clients/datasets/DatasetClient/DatasetClient.types";

import { DatasetParsers } from "$/models/datasets/Dataset/DatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createDatasetMutations } from "@/clients/datasets/DatasetClient/createDatasetMutations";
import { createDatasetQueries } from "@/clients/datasets/DatasetClient/createDatasetQueries";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

// The extra mutations and queries reach back into the generated CRUD surface.
// They receive it lazily so they never have to import the client themselves.
const datasetClientCrud: DatasetClientCrud = {
  delete: async (params) => {
    return await DatasetClient.delete(params);
  },
  getAll: async (params) => {
    return await DatasetClient.getAll(params);
  },
  getById: async (params) => {
    return await DatasetClient.getById(params);
  },
};

/** Provides remote dataset queries and mutations with React Query adapters. */
export const DatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Dataset",
    tableName: "datasets",
    dbTablePrimaryKey: "id",
    parsers: DatasetParsers,
    queries: (config) => {
      return createDatasetQueries({ ...config, client: datasetClientCrud });
    },

    mutations: ({ clientLogger, parsers }) => {
      return createDatasetMutations({
        client: datasetClientCrud,
        logger: clientLogger,
        parsers,
      });
    },
  }),
  {
    queryFns: [
      "getSourceDataset",
      "getWithColumns",
      "getAllDatasetsWithColumns",
    ],
    mutationFns: [
      "insertCsvFileDataset",
      "insertXlsxFileDataset",
      "insertGoogleSheetsDataset",
      "insertOpenDataDataset",
      "insertVirtualDataset",
      "fullDelete",
    ],
  },
);
