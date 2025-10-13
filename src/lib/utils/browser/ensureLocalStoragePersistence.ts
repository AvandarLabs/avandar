async function _isPersistenceEnabled(): Promise<boolean> {
  if (navigator.storage && typeof navigator.storage.persisted === "function") {
    return await navigator.storage.persisted();
  }
  return false;
}

/**
 * Ensures that the browser's local storage is persisted.
 * This is not 100% guaranteed, browsers will choose to listen to this function
 * call based on their own heuristics.
 */
export async function ensureLocalStoragePersistence(): Promise<void> {
  const alreadyPersisting = await _isPersistenceEnabled();
  if (
    !alreadyPersisting &&
    navigator.storage &&
    typeof navigator.storage.persist === "function"
  ) {
    await navigator.storage.persist();
  }
}
