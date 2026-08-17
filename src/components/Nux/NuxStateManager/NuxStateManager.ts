import { nuxActions } from "@/components/Nux/NuxStateManager/nuxActions/nuxActions";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";

/**
 * Runtime state for the onboarding tutorial.
 *
 * Mounted once per workspace in `WorkspaceLayoutContents`, above the router
 * outlet, so a route change never loses the active milestone. The transitions
 * themselves live in `nuxActions.ts` and are tested there.
 */
export const NuxStateManager = createAppStateManager({
  name: "Nux",
  initialState: INITIAL_NUX_STATE,
  actions: nuxActions,
});
