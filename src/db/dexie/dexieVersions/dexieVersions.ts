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
import { clearOpfs } from "@browser-utils";
import { prop } from "@utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import Dexie from "dexie";
import { DexieDBVersionManager } from "@/clients/dexie/DexieDBVersionManager";
import { deleteObsoleteIndexedDBs } from "@/db/dexie/deleteObsoleteIndexedDBs";
import type { LegacyLocalDatasetEntryModel } from "@/models/Legacy_LocalDatasetEntry/Legacy_LocalDatasetEntry.types";
import type { LocalDatasetModel } from "@/models/LocalDataset/LocalDataset.types";
import type { LocalPublicDatasetModel } from "@/models/LocalPublicDataset/LocalPublicDataset.types";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";
import type { ConsentAuditEntry } from "@/models/privacy/ConsentAuditEntry/ConsentAuditEntry";

const db = new Dexie("AvandarDB");

type Schemas = {
  v1: { version: 1; models: [LegacyLocalDatasetEntryModel] };
  v2: { version: 2; models: [LocalDatasetModel] };
  v3: { version: 3; models: [LocalDatasetModel, LocalPublicDatasetModel] };
  v4: { version: 4; models: [LocalDatasetModel, LocalPublicDatasetModel] };
  v5: {
    version: 5;
    models: [
      LocalDatasetModel,
      LocalPublicDatasetModel,
      ConsentAuditEntry.Model,
      ClarificationAuditEntry.Model,
    ];
  };
  v7: {
    version: 7;
    models: [
      LocalDatasetModel,
      LocalPublicDatasetModel,
      ConsentAuditEntry.Model,
      ClarificationAuditEntry.Model,
    ];
  };
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
      await clearOpfs();

      // delete all datasets from the backend. We should try to never do backend
      // operations in a local database upgrade (because it is not idempotent.
      // When a user upgardes the database in a different browser, this will run
      // again). But this is safe right now because we have not launched the
      // platform yet.
      const { data: datasets } = await AvaSupabase.db()
        .from("datasets")
        .select("*")
        .throwOnError();
      const datasetIds = datasets.map(prop("id"));
      await AvaSupabase.db().from("datasets").delete().in("id", datasetIds);
    },
  }),

  AvaDexieVersionManager.defineVersion<3>({
    db,
    version: 3,
    models: {
      LocalDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["userId", "workspaceId"],
      },
      LocalPublicDataset: {
        primaryKey: "datasetId",
      },
    },

    upgrader: async () => {},
  }),

  /**
   * Adds a secondary index on `dashboardId` for `LocalPublicDataset` so
   * filters and upserts can target that column without full-table scans.
   */
  AvaDexieVersionManager.defineVersion<4>({
    db,
    version: 4,
    models: {
      LocalDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["userId", "workspaceId"],
      },
      LocalPublicDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["dashboardId"],
      },
    },

    upgrader: async () => {},
  }),

  AvaDexieVersionManager.defineVersion<5>({
    db,
    version: 5,
    models: {
      LocalDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["userId", "workspaceId"],
      },
      LocalPublicDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["dashboardId"],
      },
      ConsentAuditEntry: {
        primaryKey: "id",
        columnsToIndex: [
          "workspaceId",
          "userId",
          "timestamp",
          "context",
          "decision",
        ],
      },
      ClarificationAuditEntry: {
        primaryKey: "id",
        columnsToIndex: ["workspaceId", "timestamp", "outcome", "turnNumber"],
      },
    },

    upgrader: async () => {},
  }),

  /**
   * Removes retired feature tables and deletes their older standalone
   * databases. Planning data is intentionally discarded.
   */
  AvaDexieVersionManager.defineVersion<7>({
    db,
    version: 7,
    models: {
      LocalDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["userId", "workspaceId"],
      },
      LocalPublicDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["dashboardId"],
      },
      ConsentAuditEntry: {
        primaryKey: "id",
        columnsToIndex: [
          "workspaceId",
          "userId",
          "timestamp",
          "context",
          "decision",
        ],
      },
      ClarificationAuditEntry: {
        primaryKey: "id",
        columnsToIndex: ["workspaceId", "timestamp", "outcome", "turnNumber"],
      },
    },

    upgrader: async () => {
      await deleteObsoleteIndexedDBs();
    },
  }),
] as const;

AvaDexieVersionManager.registerVersions(DBDefinitions);

/** Registry key for the current AvaDexie schema version. */
export const CURRENT_AVA_DEXIE_VERSION = "v7" as const satisfies keyof Schemas;
