import Dexie from "dexie";
import { defineDexieDBVersion } from "@/lib/clients/dexie/defineDexieDBVersion";
import { LocalDatasetEntryModel } from "@/models/datasets/LocalDatasetEntry";

const db = new Dexie("AvandarDB");
type DexieDBModels = [LocalDatasetEntryModel];

// Current dexie version
export const CurrentDexieDBVersion = defineDexieDBVersion<DexieDBModels>({
  db,
  version: 1,
  models: { LocalDatasetEntry: { primaryKey: "datasetId" } },
});
