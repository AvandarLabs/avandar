import { AvaDexie } from "@/dexie/AvaDexie";
import { createDexieCRUDClient } from "@/lib/clients/dexie/createDexieCRUDClient";
import { LocalDatasetEntryParsers } from "@/models/datasets/LocalDatasetEntry";

export const LocalDatasetEntryClient = createDexieCRUDClient({
  db: AvaDexie.DB,
  modelName: "LocalDatasetEntry",
  parsers: LocalDatasetEntryParsers,
});
