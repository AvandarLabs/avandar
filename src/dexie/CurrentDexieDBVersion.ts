import Dexie from "dexie";
import { defineDexieDBVersion } from "@/lib/clients/dexie/defineDexieDBVersion";
import { DatasetRawDataModel } from "@/models/datasets/DatasetRawData";

const db = new Dexie("AvandarDB");
type DexieDBModels = [DatasetRawDataModel];

// Current dexie version
export const CurrentDexieDBVersion = defineDexieDBVersion<DexieDBModels>({
  db,
  version: 1,
  models: { DatasetRawData: { primaryKey: "datasetId" } },
});
