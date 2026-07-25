import { useEffect } from "react";
import { ImportJobsManager } from "@/clients/datasets/ImportJobsManager";

/**
 * Attach a `beforeunload` handler whenever at least one background parquet
 * transcoding job is in flight, and remove it once the registry empties.
 * The browser
 * forces the standard "Are you sure you want to leave?" prompt (no
 * custom text), so we just call `preventDefault()` and set
 * `returnValue`.
 *
 * Mount this once at the root of the app (inside the workspace shell).
 */
export function useImportJobsBeforeUnloadGuard(): void {
  useEffect(function registerBeforeUnloadGuard() {
    const handler = (event: BeforeUnloadEvent) => {
      if (!ImportJobsManager.hasActiveJob()) {
        return;
      }
      // Modern browsers ignore the message string; setting returnValue +
      // preventDefault is sufficient to trigger the native confirm.
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);
}
