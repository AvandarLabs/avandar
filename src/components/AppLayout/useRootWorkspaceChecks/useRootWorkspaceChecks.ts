import { useEnsureLocalStoragePersistence } from "@/components/AppLayout/useRootWorkspaceChecks/useEnsureLocalStoragePersistence";
import { useEnsureWorkspaceBilling } from "./useEnsureWorkspaceBilling";
import { useSyncLocalDatasets } from "./useSyncLocalDatasets";

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
  // up space in the user's browser
  useSyncLocalDatasets();
}
