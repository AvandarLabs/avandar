import { Logger } from "$/lib/Logger/Logger";
import { uuid } from "@/lib/utils/uuid";
import { User } from "@/models/User/User.types";
import { AvaSupabase } from "../supabase/AvaSupabase";
import {
  AvaDexieVersionManager,
  CURRENT_AVA_DEXIE_VERSION,
} from "./dexieVersions";

const currentDexieDBVersion = AvaDexieVersionManager.getVersion(
  CURRENT_AVA_DEXIE_VERSION,
);

export const AvaDexie = {
  DB: currentDexieDBVersion,

  /**
   * Deletes the Avandar IndexedDB from the browser.
   */
  deleteDatabase: async (): Promise<void> => {
    try {
      await currentDexieDBVersion.delete();
      Logger.log("Database deleted successfully");
    } catch (err) {
      Logger.error("Failed to delete database", err);
      throw err;
    }
  },

  /**
   * Syncs the Dexie database version in the backend with the current version.
   * 1. If the user deleted the `meta` table, this will create it again.
   * 2. If the user deleted the version number from the `meta` table, or if it
   *    is out of sync, this will create it again.
   * 3. If the user deleted the db_id, this will create it again.
   * 4. Sync the dexie db metadata to the backend. We can use this to get an
   *    idea of which users still have stale DBs and when it's safe to delete an
   *    older Dexie version from our codebase so we no longer have to bundle it.
   */
  syncDBVersion: async (user: User | undefined): Promise<void> => {
    if (currentDexieDBVersion.verno && currentDexieDBVersion.verno > 0) {
      // first, make sure the `meta` table exists and the user didn't just
      // fully delete it
      const metaTableExists = currentDexieDBVersion.tables.some((table) => {
        return table.name === "meta";
      });

      // delete the DB and refresh the page (so it can be recreated) if the
      // `meta` table isn't there
      if (!metaTableExists) {
        Logger.error(
          "Meta table does not exist. Resetting the frontend database and refreshing.",
        );
        await currentDexieDBVersion.delete();
        window.location.reload();
      }

      // once we're sure the `meta` table exists, reset the db version
      // and the db_id if they are out of sync or don't exist
      if (metaTableExists) {
        //
        const currentMetaVersion = Number(
          (await currentDexieDBVersion.meta.get("version"))?.value ?? 0,
        );
        if (currentMetaVersion !== currentDexieDBVersion.verno) {
          await currentDexieDBVersion.meta.put({
            key: "version",
            value: String(currentDexieDBVersion.verno),
          });
        }

        const dbId = (await currentDexieDBVersion.meta.get("db_id"))?.value;
        if (!dbId) {
          await currentDexieDBVersion.meta.put({ key: "db_id", value: uuid() });
        }
      }
    }

    const dbId = (await currentDexieDBVersion.meta.get("db_id"))?.value;
    if (user && dbId) {
      // Sync the dexie db metadata to the backend
      await AvaSupabase.DB.from("dexie_dbs")
        .upsert(
          {
            user_id: user.id,
            db_id: dbId,
            version: currentDexieDBVersion.verno,
            user_agent: navigator.userAgent,
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: "db_id,user_id",
            ignoreDuplicates: false,
          },
        )
        .throwOnError();
    }
  },
};

export type AvaDexieDB = typeof currentDexieDBVersion;
