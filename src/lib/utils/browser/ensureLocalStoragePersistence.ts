/**
 * Ensures that the browser's local storage is persisted.
 * This is not 100% guaranteed, browsers will choose to listen to this function
 * call based on their own heuristics.
 */
export async function ensureLocalStoragePersistence(): Promise<void> {
  const alreadyPersisting = await navigator.storage.persisted();
  if (!alreadyPersisting) {
    await navigator.storage.persist();
  }
}
