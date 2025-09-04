import { AvaDexie } from "@/dexie/AvaDexie";
import { createDexieCRUDClient } from "@/lib/clients/dexie/createDexieCRUDClient";
import { DatasetLocalLoadEntryParsers } from "@/models/datasets/DatasetLocalLoadEntry";

export const DatasetLocalLoadEntryClient = createDexieCRUDClient({
  db: AvaDexie.DB,
  modelName: "DatasetLocalLoadEntry",
  parsers: DatasetLocalLoadEntryParsers,
});
