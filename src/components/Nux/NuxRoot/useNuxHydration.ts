import type { Workspace } from "$/models/Workspace/Workspace";

import { useEffect, useRef } from "react";

import { hydrateNuxProgressForWorkspace } from "@/components/Nux/NuxRoot/hydrateNuxProgressForWorkspace/hydrateNuxProgressForWorkspace";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";

/** Loads the progress row once per workspace and seeds the tutorial's state. */
export function useNuxHydration(): void {
  const workspace = useCurrentWorkspace();
  const dispatch = NuxStateManager.useDispatch();
  const state = NuxStateManager.useState();
  // Keyed by workspace rather than a plain boolean so switching workspaces
  // without remounting the provider re-runs the workspace-scoped auto-check.
  const hydratedWorkspaceIdRef = useRef<Workspace.Id | undefined>(undefined);

  useEffect(
    function hydrateNuxProgress() {
      if (hydratedWorkspaceIdRef.current === workspace.id || state.isHydrated) {
        return;
      }
      hydratedWorkspaceIdRef.current = workspace.id;

      void hydrateNuxProgressForWorkspace(workspace.id)
        .then(dispatch.hydrate)
        .catch(() => {
          // A failed hydrate means no tutorial, which is the correct degraded
          // state. It must never surface as an error to a brand-new user.
          // Hydration is one-shot per workspace per mount: there is no retry,
          // because nothing this effect depends on can change to trigger one.
        });
    },
    [dispatch, state.isHydrated, workspace.id],
  );
}
