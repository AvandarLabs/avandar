import { useEffect } from "react";
import { ensureLocalStoragePersistence } from "@/lib/utils/browser/ensureLocalStoragePersistence";

/**
 * On mount, requests persistent local storage in the background.
 */
export function useEnsureLocalStoragePersistence(): void {
  useEffect(() => {
    ensureLocalStoragePersistence();
  }, []);
}
