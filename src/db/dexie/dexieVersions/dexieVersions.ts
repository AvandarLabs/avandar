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
 * **CHANGING A MODEL'S PRIMARY KEY:**
 *
 * IndexedDB cannot re-key a store in place, and Dexie aborts the whole upgrade
 * with "Not yet support for changing primary key" if you try. It also cannot
 * drop and recreate the same store within one version. A re-key therefore
 * needs two versions: name the model in `modelsToDelete` in the first, then
 * declare it again under `models` in the next. Everything the store held is
 * destroyed, so only re-key stores whose contents can be derived again.
 *
 * **WHAT AN `upgrader` MAY DO:**
 *
 * Only work that belongs to the version-change transaction, meaning reads and
 * writes against `tx.table(...)`. Awaiting anything else (a network call, a
 * different IndexedDB database, OPFS) suspends the upgrader on a task outside
 * the transaction, and the browser then commits it early and silently drops
 * every schema change belonging to a later version.
 *
 * TODO(jpsyx): in the event that we delete an older version prematurely, we
 * should add a function that shows a warning to the user saying that local data
 * was lost and we should clear the IndexedDB database and try to seed it as
 * much as possible with defaults or data we can get from the backend.
 */
import { clearOpfs } from "@avandar/browser-utils";
import { prop } from "@avandar/utils";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import Dexie from "dexie";
import { DexieDBVersionManager } from "@/clients/dexie/DexieDBVersionManager";
import { deleteObsoleteIndexedDBs } from "@/db/dexie/deleteObsoleteIndexedDBs";
import { Logger } from "@/utils/Logger";
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
  v8: {
    version: 8;
    models: [
      LocalDatasetModel,
      ConsentAuditEntry.Model,
      ClarificationAuditEntry.Model,
    ];
  };
  v9: {
    version: 9;
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

    upgrader: () => {
      // Deliberately not awaited. `deleteObsoleteIndexedDBs` deletes *other*
      // IndexedDB databases, so awaiting it suspends this upgrader on a task
      // that is outside the version-change transaction. The browser then
      // auto-commits the transaction early and silently drops every schema
      // change belonging to a later version, leaving the database stamped
      // with the newest version number but carrying an older shape.
      void deleteObsoleteIndexedDBs().catch((error: unknown) => {
        // Detached work cannot fail the upgrade, and an unhandled rejection
        // here would surface as a spurious app-level error.
        Logger.error("Failed to delete obsolete IndexedDB databases", error);
      });
    },
  }),

  // Deletes the public snapshot cache so that v9 can recreate it keyed on
  // [dashboardId+datasetId]. IndexedDB cannot re-key a store in place, and
  // Dexie cannot drop and recreate the same store within one version, so the
  // re-key has to straddle v8 and v9. Dropping the rows is safe: they are a
  // cache of parquet blobs that can be downloaded again.
  AvaDexieVersionManager.defineVersion<8>({
    db,
    version: 8,
    models: {
      LocalDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["userId", "workspaceId"],
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

    modelsToDelete: ["LocalPublicDataset"],
  }),

  // Recreates the public snapshot cache keyed on [dashboardId+datasetId]. A
  // dataset ID cannot identify a dashboard snapshot because dashboards may
  // publish different slices of the same dataset, so keying by dataset alone
  // lets one dashboard's snapshot overwrite another's, including serving a
  // private snapshot into a public dashboard's render.
  AvaDexieVersionManager.defineVersion<9>({
    db,
    version: 9,
    models: {
      LocalDataset: {
        primaryKey: "datasetId",
        columnsToIndex: ["userId", "workspaceId"],
      },
      LocalPublicDataset: {
        primaryKey: ["dashboardId", "datasetId"],
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
  }),
] as const;

AvaDexieVersionManager.registerVersions(DBDefinitions);

/** Registry key for the current AvaDexie schema version. */
export const CURRENT_AVA_DEXIE_VERSION = "v9" as const satisfies keyof Schemas;
