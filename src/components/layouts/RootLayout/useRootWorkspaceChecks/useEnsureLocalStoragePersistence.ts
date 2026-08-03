import { ensureLocalStoragePersistence } from "@browser-utils";
import { useEffect } from "react";

/**
 * On mount, requests persistent local storage in the background.
 */
export function useEnsureLocalStoragePersistence(): void {
  useEffect(() => {
    ensureLocalStoragePersistence();
  }, []);
}
