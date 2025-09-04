import Dexie from "dexie";
import { defineDexieDBVersion } from "@/lib/clients/dexie/defineDexieDBVersion";
import { DatasetLocalLoadEntryModel } from "@/models/datasets/DatasetLocalLoadEntry";

const db = new Dexie("AvandarDB");
type DexieDBModels = [DatasetLocalLoadEntryModel];

// Current dexie version
export const CurrentDexieDBVersion = defineDexieDBVersion<DexieDBModels>({
  db,
  version: 1,
  models: { DatasetLocalLoadEntry: { primaryKey: "datasetId" } },
});
