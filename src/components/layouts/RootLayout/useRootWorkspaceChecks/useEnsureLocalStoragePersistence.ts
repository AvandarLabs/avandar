import { ensureLocalStoragePersistence } from "@avandar/browser-utils";
import { useEffect } from "react";

/**
 * Requests persistent browser storage when the component mounts.
 * Use it, for example, when a workspace relies on locally stored data.
 */
export function useEnsureLocalStoragePersistence(): void {
  useEffect(() => {
    ensureLocalStoragePersistence();
  }, []);
}
