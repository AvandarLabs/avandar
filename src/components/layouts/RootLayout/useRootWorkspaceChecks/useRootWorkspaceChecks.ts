import { useImportJobsBeforeUnloadGuard } from "@/clients/datasets/useBeforeUnloadGuard";
import { useEnsureLocalStoragePersistence } from "@/components/layouts/RootLayout/useRootWorkspaceChecks/useEnsureLocalStoragePersistence";
import { useEnsureWorkspaceBilling } from "@/components/layouts/RootLayout/useRootWorkspaceChecks/useEnsureWorkspaceBilling";
import { useSyncLocalDatasets } from "@/components/layouts/RootLayout/useRootWorkspaceChecks/useSyncLocalDatasets";

/**
 * These are all checks that need to run at the root level of a workspace.
 */
export function useRootWorkspaceChecks(): void {
  // request persistent local storage to the browser
  useEnsureLocalStoragePersistence();

  // At the root level of the app we check if the workspace has a billing setup
  useEnsureWorkspaceBilling();

  // At the root level of the app we check if this workspace is missing
  // any datasets that should exist locally in the browser
  // This also handles deleting datasets locally that should no longer take
  // up space in the user's browser, and resumes CSV/XLSX-to-parquet imports
  // that were interrupted by a previous tab close.
  useSyncLocalDatasets();

  // While at least one parquet import is running, warn the user if they
  // try to close the tab. Losing the source File reference means the
  // job won't resume unless the source bytes were small enough to cache
  // in IndexedDB.
  useImportJobsBeforeUnloadGuard();
}
