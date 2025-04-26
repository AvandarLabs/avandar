import { createDexieCRUDClient } from "@/lib/clients/createDexieCRUDClient";
import { LocalDatasetParsers } from "./parsers";

export const LocalDatasetClient = createDexieCRUDClient({
  modelName: "LocalDataset",
  primaryKey: "id",
  parsers: LocalDatasetParsers,
  extendWith: ({ db }) => {
    return {
      deleteDatabase: async (): Promise<void> => {
        await db.delete();
      },
    };
  },
});
