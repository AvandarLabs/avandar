import Dexie from "dexie";

const OBSOLETE_INDEXED_DB_NAMES = [
  "AvandarPlanStepDB",
  "AvandarPlanAnnotationDB",
] as const;

/**
 * Deletes obsolete IndexedDB databases that contain retired feature data.
 *
 * Safe to remove after all clients that might retain these databases have
 * upgraded to Dexie v7.
 */
export async function deleteObsoleteIndexedDBs(): Promise<void> {
  await Promise.all(
    OBSOLETE_INDEXED_DB_NAMES.map(async (databaseName) => {
      await Dexie.delete(databaseName);
    }),
  );
}
