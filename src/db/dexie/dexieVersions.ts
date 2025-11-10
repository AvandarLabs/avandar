/**
 * This file defines the current Dexie version and previous versions, along with
 * their upgrade (migration) functions.
 *
 * **WHEN IS IT SAFE TO DELETE AN OLDER VERSION?**
 *
 * It's safe to delete an older version **only** when we are sure that no
 * existing clients are using it. In Supabase we track the version of all known
 * Dexie dbs and can use this to guess when it's safe to delete an older
 * version.
 *
 * **INSTRUCTIONS TO CREATE A NEW VERSION:**
 *
 * 1. In the `Schemas` type, add your new version.
 * 2. In `DBDefinitions`, add a `AvaDexieVersionManager.defineVersion` call.
 *    Include an `upgrader` function if necessary.
 *
 * TODO(jpsyx): in the event that we delete an older version prematurely, we
 * should add a function that shows a warning to the user saying that local data
 * was lost and we should clear the IndexedDB database and try to seed it as
 * much as possible with defaults or data we can get from the backend.
 */
import Dexie from "dexie";
import { DexieDBVersionManager } from "@/lib/clients/dexie/DexieDBVersionManager";
import { AvaSupabase } from "../supabase/AvaSupabase";
import { clearOPFS } from "@/lib/utils/browser/clearOPFS";
import { prop } from "@/lib/utils/objects/higherOrderFuncs";
import { LegacyLocalDatasetEntryModel } from "@/models/datasets/Legacy_LocalDatasetEntry";
import { LocalDatasetModel } from "@/models/datasets/LocalDataset";

const db = new Dexie("AvandarDB");

type Schemas = {
  v1: { version: 1; models: [LegacyLocalDatasetEntryModel] };
  v2: { version: 2; models: [LocalDatasetModel] };
};

export const AvaDexieVersionManager = DexieDBVersionManager.make<Schemas>();

// All Dexie versions. The order of these operations matter.
// Versions should be registered from oldest to newest.
const DBDefinitions = [
  AvaDexieVersionManager.defineVersion<1>({
    db,
    version: 1,
    models: { LocalDatasetEntry: { primaryKey: "datasetId" } },
  }),

  AvaDexieVersionManager.defineVersion<2>({
    db,
    version: 2,
    models: {
      LocalDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["userId", "workspaceId"],
      },
    },

    // Going for a full reset of all data. This should not be common,
    // but it's safe right now since we have not launched the platform yet.
    upgrader: async (tx) => {
      // clear the local dataset entry table
      await tx.table("LocalDatasetEntry").clear();
      await clearOPFS();

      // delete all datasets from the backend. We should try to never do backend
      // operations in a local database upgrade (because it is not idempotent.
      // When a user upgardes the database in a different browser, this will run
      // again). But this is safe right now because we have not launched the
      // platform yet.
      const { data: datasets } = await AvaSupabase.DB.from("datasets")
        .select("*")
        .throwOnError();
      const datasetIds = datasets.map(prop("id"));
      await AvaSupabase.DB.from("datasets").delete().in("id", datasetIds);
    },
  }),
] as const;

AvaDexieVersionManager.registerVersions(DBDefinitions);

export const CURRENT_AVA_DEXIE_VERSION = "v2" as const satisfies keyof Schemas;
